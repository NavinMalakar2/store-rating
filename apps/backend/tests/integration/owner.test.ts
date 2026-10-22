import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/database/prisma';
import { anon, API, loginAs, makeStore, makeUser, resetDb } from '../helpers';

beforeEach(resetDb);

async function setup() {
  const o1 = await makeUser('STORE_OWNER'); const o2 = await makeUser('STORE_OWNER');
  const s1 = await makeStore({ ownerId: o1.id }); const s2 = await makeStore({ ownerId: o2.id });
  const users = await Promise.all([1, 2, 3].map(() => makeUser('USER')));
  await prisma.rating.createMany({ data: [
    { userId: users[0].id, storeId: s1.id, rating: 5 }, { userId: users[1].id, storeId: s1.id, rating: 4 }, { userId: users[2].id, storeId: s1.id, rating: 4 },
    { userId: users[0].id, storeId: s2.id, rating: 1 },
  ] });
  return { o1, o2, s1, s2, users };
}

describe('owner dashboard', () => {
  it('requires the STORE_OWNER role', async () => {
    expect((await anon().get(`${API}/owner/dashboard`)).status).toBe(401);
    for (const role of ['USER', 'ADMIN'] as const) {
      const u = await makeUser(role);
      expect((await (await loginAs(u.email)).get(`${API}/owner/dashboard`)).status).toBe(403);
    }
  });
  it('aggregates average, total and distribution from persisted ratings', async () => {
    const { o1, s1 } = await setup();
    const res = await (await loginAs(o1.email)).get(`${API}/owner/dashboard`);
    expect(res.status).toBe(200);
    expect(res.body.data.store.id).toBe(s1.id);
    expect(res.body.data.stats).toMatchObject({ averageRating: 4.33, totalRatings: 3 });
    expect(res.body.data.stats.distribution.map((d: { count: number }) => d.count)).toEqual([0, 0, 0, 2, 1]);
    expect(res.body.data.ratings).toHaveLength(3);
    expect(res.body.data.ratings[0]).toHaveProperty('createdAt');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });
  it('isolates owners: each only sees their own store, ignoring any storeId they send', async () => {
    const { o1, o2, s1, s2 } = await setup();
    const r2 = await (await loginAs(o2.email)).get(`${API}/owner/dashboard?storeId=${s1.id}`);
    expect(r2.body.data.store.id).toBe(s2.id);
    expect(r2.body.data.stats.totalRatings).toBe(1);
    const r1 = await (await loginAs(o1.email)).get(`${API}/owner/dashboard`);
    expect(r1.body.data.ratings.every((r: { user: { id: string } }) => r.user.id)).toBe(true);
    expect(r1.body.data.stats.totalRatings).toBe(3);
  });
  it('paginates, sorts and searches the ratings list in the backend', async () => {
    const { o1 } = await setup();
    const agent = await loginAs(o1.email);
    const byRating = await agent.get(`${API}/owner/dashboard?sortBy=rating&sortOrder=desc&limit=2`);
    expect(byRating.body.data.ratings.map((r: { rating: number }) => r.rating)).toEqual([5, 4]);
    expect(byRating.body.meta).toMatchObject({ totalRecords: 3, totalPages: 2, pageSize: 2 });
    const page2 = await agent.get(`${API}/owner/dashboard?sortBy=rating&sortOrder=desc&limit=2&page=2`);
    expect(page2.body.data.ratings).toHaveLength(1);
    const email = (await prisma.user.findFirstOrThrow({ where: { role: 'USER' }, orderBy: { email: 'asc' } })).email;
    expect((await agent.get(`${API}/owner/dashboard?search=${encodeURIComponent(email)}`)).body.meta.totalRecords).toBeLessThanOrEqual(1);
    expect((await agent.get(`${API}/owner/dashboard?sortBy=passwordHash`)).status).toBe(422);
    expect((await agent.get(`${API}/owner/dashboard?page=0`)).status).toBe(422);
  });
  it('handles an owner without a store and a store without ratings', async () => {
    const lonely = await makeUser('STORE_OWNER');
    const r = await (await loginAs(lonely.email)).get(`${API}/owner/dashboard`);
    expect(r.status).toBe(200);
    expect(r.body.data.store).toBeNull();
    expect(r.body.data.stats.totalRatings).toBe(0);
    const o = await makeUser('STORE_OWNER');
    await makeStore({ ownerId: o.id });
    const empty = await (await loginAs(o.email)).get(`${API}/owner/dashboard`);
    expect(empty.body.data.stats).toMatchObject({ averageRating: null, totalRatings: 0 });
    expect(empty.body.data.ratings).toEqual([]);
  });
  it('reflects rating updates made by users', async () => {
    const { o1, s1, users } = await setup();
    const ua = await loginAs(users[0].email);
    await ua.patch(`${API}/stores/${s1.id}/ratings`).send({ rating: 1 });
    const res = await (await loginAs(o1.email)).get(`${API}/owner/dashboard`);
    expect(res.body.data.stats).toMatchObject({ averageRating: 3, totalRatings: 3 });
  });
});
