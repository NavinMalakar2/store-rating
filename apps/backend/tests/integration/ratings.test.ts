import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/database/prisma';
import { anon, API, loginAs, makeStore, makeUser, resetDb } from '../helpers';

let user: Awaited<ReturnType<typeof makeUser>>;
let agent: Awaited<ReturnType<typeof loginAs>>;
beforeEach(async () => {
  await resetDb();
  user = await makeUser('USER');
  agent = await loginAs(user.email);
});

describe('store directory', () => {
  it('requires auth and the USER role', async () => {
    expect((await anon().get(`${API}/stores`)).status).toBe(401);
    for (const role of ['ADMIN', 'STORE_OWNER'] as const) {
      const u = await makeUser(role);
      expect((await (await loginAs(u.email)).get(`${API}/stores`)).status).toBe(403);
    }
  });
  it('lists stores with overall + own rating, hides store e-mail, searches name/address', async () => {
    const a = await makeStore({ name: 'Alpha Hardware Superstore Ltd', address: '1 Mumbai Road' });
    const b = await makeStore({ name: 'Bravo Bakery And Cafe Limited', address: '2 Delhi Road' });
    const other = await makeUser('USER');
    await prisma.rating.createMany({ data: [{ userId: user.id, storeId: a.id, rating: 4 }, { userId: other.id, storeId: a.id, rating: 5 }, { userId: other.id, storeId: b.id, rating: 1 }] });
    const all = await agent.get(`${API}/stores`);
    expect(all.status).toBe(200);
    const byName = Object.fromEntries(all.body.data.map((s: { id: string }) => [s.id, s]));
    expect(byName[a.id]).toMatchObject({ averageRating: 4.5, myRating: 4, ratingCount: 2 });
    expect(byName[b.id]).toMatchObject({ averageRating: 1, myRating: null });
    expect(byName[a.id]).not.toHaveProperty('email');
    expect((await agent.get(`${API}/stores?search=bakery`)).body.data).toHaveLength(1);
    expect((await agent.get(`${API}/stores?search=delhi`)).body.data[0].id).toBe(b.id);
    expect((await agent.get(`${API}/stores?address=mumbai`)).body.meta.totalRecords).toBe(1);
    expect((await agent.get(`${API}/stores?search=nothing-matches`)).body.data).toEqual([]);
    expect((await agent.get(`${API}/stores?sortBy=myRating&sortOrder=desc`)).body.data[0].id).toBe(a.id);
    expect((await agent.get(`${API}/stores?sortBy=email`)).status).toBe(422);
  });
  it('shows "no rating" as null for unrated stores, and handles an empty directory', async () => {
    expect((await agent.get(`${API}/stores`)).body.data).toEqual([]);
    const s = await makeStore();
    const res = await agent.get(`${API}/stores/${s.id}`);
    expect(res.body.data).toMatchObject({ averageRating: null, myRating: null, ratingCount: 0 });
    expect((await agent.get(`${API}/stores/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
  });
});

describe('rating submission', () => {
  it('submits, then updates, recomputing the average', async () => {
    const s = await makeStore();
    const created = await agent.post(`${API}/stores/${s.id}/ratings`).send({ rating: 3 });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ myRating: 3, averageRating: 3 });
    const updated = await agent.patch(`${API}/stores/${s.id}/ratings`).send({ rating: 5 });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ myRating: 5, averageRating: 5, ratingCount: 1 });
    expect(await prisma.rating.count()).toBe(1);
  });
  it('rejects a second rating for the same store with 409 (and 404 when updating a missing one)', async () => {
    const s = await makeStore();
    expect((await agent.patch(`${API}/stores/${s.id}/ratings`).send({ rating: 2 })).status).toBe(404);
    await agent.post(`${API}/stores/${s.id}/ratings`).send({ rating: 2 });
    expect((await agent.post(`${API}/stores/${s.id}/ratings`).send({ rating: 4 })).status).toBe(409);
  });
  it('is safe under concurrent duplicate submissions (exactly one wins)', async () => {
    const s = await makeStore();
    const results = await Promise.all(Array.from({ length: 6 }, () => agent.post(`${API}/stores/${s.id}/ratings`).send({ rating: 4 })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await prisma.rating.count()).toBe(1);
  });
  it.each([0, 6, 2.5, '3', null, -1])('rejects invalid rating %j with 422', async (rating) => {
    const s = await makeStore();
    expect((await agent.post(`${API}/stores/${s.id}/ratings`).send({ rating })).status).toBe(422);
  });
  it('rejects missing body, bad ids and unknown stores', async () => {
    const s = await makeStore();
    expect((await agent.post(`${API}/stores/${s.id}/ratings`).send({})).status).toBe(422);
    expect((await agent.post(`${API}/stores/xyz/ratings`).send({ rating: 3 })).status).toBe(422);
    expect((await agent.post(`${API}/stores/00000000-0000-4000-8000-000000000000/ratings`).send({ rating: 3 })).status).toBe(404);
  });
  it('admins and store owners cannot rate; users cannot touch other users\' ratings', async () => {
    const s = await makeStore();
    for (const role of ['ADMIN', 'STORE_OWNER'] as const) {
      const u = await makeUser(role);
      expect((await (await loginAs(u.email)).post(`${API}/stores/${s.id}/ratings`).send({ rating: 3 })).status).toBe(403);
    }
    // userId in the body is ignored; the identity comes from the session
    const victim = await makeUser('USER');
    await agent.post(`${API}/stores/${s.id}/ratings`).send({ rating: 1, userId: victim.id });
    expect(await prisma.rating.count({ where: { userId: victim.id } })).toBe(0);
    expect(await prisma.rating.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe('database-level guarantees', () => {
  it('UNIQUE(userId, storeId) is enforced by PostgreSQL', async () => {
    const s = await makeStore();
    await prisma.rating.create({ data: { userId: user.id, storeId: s.id, rating: 3 } });
    await expect(prisma.rating.create({ data: { userId: user.id, storeId: s.id, rating: 4 } })).rejects.toThrow();
  });
  it('CHECK constraint rejects ratings outside 1-5', async () => {
    const s = await makeStore();
    await expect(prisma.$executeRaw`INSERT INTO "Rating"("id","userId","storeId","rating","updatedAt") VALUES (gen_random_uuid(), ${user.id}::uuid, ${s.id}::uuid, 9, now())`).rejects.toThrow();
  });
  it('trigger rejects ratings from non-USER roles', async () => {
    const s = await makeStore();
    const admin = await makeUser('ADMIN');
    await expect(prisma.rating.create({ data: { userId: admin.id, storeId: s.id, rating: 3 } })).rejects.toThrow();
  });
  it('deleting a store cascades to its ratings', async () => {
    const s = await makeStore();
    await prisma.rating.create({ data: { userId: user.id, storeId: s.id, rating: 3 } });
    await prisma.store.delete({ where: { id: s.id } });
    expect(await prisma.rating.count()).toBe(0);
  });
});
