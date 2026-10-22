import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/database/prisma';
import { anon, API, loginAs, makeStore, makeUser, resetDb } from '../helpers';

const newUser = (o: object = {}) => ({
  name: 'Created By Admin Test User', email: 'created@test.dev', address: '1 Admin Road', password: 'Valid@123', role: 'USER', ...o,
});
const newStoreBody = (o: object = {}) => ({ name: 'Brand New Test Store Limited', email: 'brand@store.test', address: '2 Store Road', ...o });

let admin: Awaited<ReturnType<typeof loginAs>>;
beforeEach(async () => {
  await resetDb();
  const a = await makeUser('ADMIN');
  admin = await loginAs(a.email);
});

describe('authorization', () => {
  it.each(['USER', 'STORE_OWNER'] as const)('%s cannot use admin APIs', async (role) => {
    const u = await makeUser(role);
    const agent = await loginAs(u.email);
    for (const path of ['/admin/dashboard', '/admin/users', '/admin/stores']) expect((await agent.get(API + path)).status).toBe(403);
    expect((await agent.post(`${API}/admin/users`).send(newUser({ role: 'ADMIN' }))).status).toBe(403);
    expect((await agent.post(`${API}/admin/stores`).send(newStoreBody())).status).toBe(403);
  });
  it('anonymous gets 401', async () => {
    expect((await anon().get(`${API}/admin/users`)).status).toBe(401);
  });
});

describe('dashboard', () => {
  it('returns database-derived totals', async () => {
    const o = await makeUser('STORE_OWNER');
    const s = await makeStore({ ownerId: o.id });
    const u1 = await makeUser('USER'); const u2 = await makeUser('USER');
    await prisma.rating.createMany({ data: [{ userId: u1.id, storeId: s.id, rating: 5 }, { userId: u2.id, storeId: s.id, rating: 4 }] });
    const res = await admin.get(`${API}/admin/dashboard`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalUsers: 4, totalStores: 1, totalRatings: 2, averageRating: 4.5 });
    expect(res.body.data.ratingDistribution).toHaveLength(5);
  });
});

describe('user management', () => {
  it('creates users of every role', async () => {
    for (const [i, role] of (['USER', 'ADMIN', 'STORE_OWNER'] as const).entries()) {
      const res = await admin.post(`${API}/admin/users`).send(newUser({ role, email: `c${i}@test.dev` }));
      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe(role);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
    }
  });
  it('validates input and rejects duplicate emails', async () => {
    expect((await admin.post(`${API}/admin/users`).send(newUser({ name: 'short' }))).status).toBe(422);
    expect((await admin.post(`${API}/admin/users`).send(newUser({ role: 'SUPERUSER' }))).status).toBe(422);
    expect((await admin.post(`${API}/admin/users`).send(newUser({ password: 'weak' }))).status).toBe(422);
    expect((await admin.post(`${API}/admin/users`).send(newUser())).status).toBe(201);
    expect((await admin.post(`${API}/admin/users`).send(newUser())).status).toBe(409);
  });
  it('creates a store owner together with a new store atomically', async () => {
    const res = await admin.post(`${API}/admin/users`).send(newUser({ role: 'STORE_OWNER', newStore: newStoreBody() }));
    expect(res.status).toBe(201);
    expect(res.body.data.store).toMatchObject({ name: 'Brand New Test Store Limited', averageRating: null, ratingCount: 0 });
  });
  it('rolls back the user when the store part fails', async () => {
    await makeStore().then((s) => prisma.store.update({ where: { id: s.id }, data: { email: 'brand@store.test' } }));
    const res = await admin.post(`${API}/admin/users`).send(newUser({ role: 'STORE_OWNER', newStore: newStoreBody() }));
    expect(res.status).toBe(409);
    expect(await prisma.user.count({ where: { email: 'created@test.dev' } })).toBe(0);
  });
  it('attaches an existing unowned store, but not an owned one; non-owners cannot get stores', async () => {
    const free = await makeStore();
    const ok = await admin.post(`${API}/admin/users`).send(newUser({ role: 'STORE_OWNER', storeId: free.id }));
    expect(ok.status).toBe(201);
    expect(ok.body.data.store.id).toBe(free.id);
    const again = await admin.post(`${API}/admin/users`).send(newUser({ role: 'STORE_OWNER', email: 'o2@test.dev', storeId: free.id }));
    expect(again.status).toBe(409);
    const bad = await admin.post(`${API}/admin/users`).send(newUser({ role: 'USER', email: 'o3@test.dev', storeId: free.id }));
    expect(bad.status).toBe(422);
  });
  it('filters, searches, sorts and paginates in the backend', async () => {
    const mk = (name: string, email: string, address: string, role: 'USER' | 'ADMIN') => makeUser(role, { name, email, address });
    await mk('Alpha Customer With Long Name', 'alpha@x.dev', '1 Pune Road', 'USER');
    await mk('Bravo Customer With Long Name', 'bravo@x.dev', '2 Delhi Road', 'USER');
    await mk('Charlie Admin With Long Name', 'charlie@x.dev', '3 Pune Road', 'ADMIN');
    const byRole = await admin.get(`${API}/admin/users?role=USER&sortBy=name&sortOrder=desc`);
    expect(byRole.body.data.map((u: { name: string }) => u.name)).toEqual(['Bravo Customer With Long Name', 'Alpha Customer With Long Name']);
    expect(byRole.body.meta.totalRecords).toBe(2);
    const byAddr = await admin.get(`${API}/admin/users?address=pune&sortBy=email`);
    expect(byAddr.body.meta.totalRecords).toBe(2);
    const combo = await admin.get(`${API}/admin/users?address=pune&role=ADMIN`);
    expect(combo.body.data).toHaveLength(1);
    const search = await admin.get(`${API}/admin/users?search=BRAVO`);
    expect(search.body.data).toHaveLength(1);
    const page = await admin.get(`${API}/admin/users?limit=2&page=2&sortBy=email`);
    expect(page.body.meta).toMatchObject({ currentPage: 2, pageSize: 2, totalRecords: 4, totalPages: 2 });
    expect(page.body.data).toHaveLength(2);
    const o1 = await makeUser('STORE_OWNER'); await makeStore({ ownerId: o1.id }); await makeUser('STORE_OWNER');
    const free = await admin.get(`${API}/admin/users?role=STORE_OWNER&withoutStore=true`);
    expect(free.body.meta.totalRecords).toBe(1);
    const none = await admin.get(`${API}/admin/users?search=zzzzzz`);
    expect(none.body.data).toEqual([]);
  });
  it('treats % and _ in filters literally and rejects invalid query params', async () => {
    await makeUser('USER', { name: 'Percent Literal Customer Name', email: 'p@x.dev' });
    expect((await admin.get(`${API}/admin/users?search=%25`)).body.meta.totalRecords).toBe(0 + 0 + (await prisma.user.count({ where: { OR: [{ name: { contains: '%' } }, { email: { contains: '%' } }, { address: { contains: '%' } }] } })));
    for (const q of ['page=0', 'page=-3', 'limit=1000', 'sortBy=passwordHash', 'sortOrder=up', 'role=GOD', 'name=' + 'x'.repeat(101)]) {
      expect((await admin.get(`${API}/admin/users?${q}`)).status, q).toBe(422);
    }
  });
  it('shows details incl. store + rating for owners, 404 / 422 for bad ids; safe updates only', async () => {
    const o = await makeUser('STORE_OWNER');
    const s = await makeStore({ ownerId: o.id });
    const u = await makeUser('USER');
    await prisma.rating.create({ data: { userId: u.id, storeId: s.id, rating: 3 } });
    const d = await admin.get(`${API}/admin/users/${o.id}`);
    expect(d.body.data.store).toMatchObject({ id: s.id, averageRating: 3, ratingCount: 1 });
    expect((await admin.get(`${API}/admin/users/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
    expect((await admin.get(`${API}/admin/users/not-a-uuid`)).status).toBe(422);
    const upd = await admin.patch(`${API}/admin/users/${u.id}`).send({ address: 'New Address 5', role: 'ADMIN' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.role).toBe('USER'); // role changes are ignored
    expect((await admin.patch(`${API}/admin/users/${u.id}`).send({})).status).toBe(422);
  });
});

describe('store management', () => {
  it('creates stores with/without owner and validates the owner', async () => {
    expect((await admin.post(`${API}/admin/stores`).send(newStoreBody())).status).toBe(201);
    const owner = await makeUser('STORE_OWNER');
    const withOwner = await admin.post(`${API}/admin/stores`).send(newStoreBody({ email: 'o@store.test', ownerId: owner.id }));
    expect(withOwner.status).toBe(201);
    expect(withOwner.body.data.owner.id).toBe(owner.id);
    expect((await admin.post(`${API}/admin/stores`).send(newStoreBody({ email: 'o2@store.test', ownerId: owner.id }))).status).toBe(409);
    const normal = await makeUser('USER');
    expect((await admin.post(`${API}/admin/stores`).send(newStoreBody({ email: 'n@store.test', ownerId: normal.id }))).status).toBe(422);
    const adm = await makeUser('ADMIN');
    expect((await admin.post(`${API}/admin/stores`).send(newStoreBody({ email: 'a@store.test', ownerId: adm.id }))).status).toBe(422);
    expect((await admin.post(`${API}/admin/stores`).send(newStoreBody({ email: 'brand@store.test' }))).status).toBe(409);
    expect((await admin.post(`${API}/admin/stores`).send(newStoreBody({ email: 'g@store.test', ownerId: '00000000-0000-4000-8000-000000000000' }))).status).toBe(404);
    expect((await admin.post(`${API}/admin/stores`).send(newStoreBody({ name: 'tiny' }))).status).toBe(422);
  });
  it('database trigger blocks a non-owner being assigned even bypassing the API', async () => {
    const normal = await makeUser('USER');
    await expect(makeStore({ ownerId: normal.id })).rejects.toThrow();
  });
  it('lists with average ratings, filtering, sorting by rating (nulls last) and pagination', async () => {
    const s1 = await makeStore({ name: 'Alpha Store Number One Limited' });
    const s2 = await makeStore({ name: 'Bravo Store Number Two Limited' });
    await makeStore({ name: 'Charlie Store Unrated Limited Co' });
    const [u1, u2] = [await makeUser('USER'), await makeUser('USER')];
    await prisma.rating.createMany({ data: [
      { userId: u1.id, storeId: s1.id, rating: 5 }, { userId: u2.id, storeId: s1.id, rating: 4 },
      { userId: u1.id, storeId: s2.id, rating: 2 },
    ] });
    const desc = await admin.get(`${API}/admin/stores?sortBy=rating&sortOrder=desc`);
    expect(desc.body.data.map((s: { averageRating: number | null }) => s.averageRating)).toEqual([4.5, 2, null]);
    const asc = await admin.get(`${API}/admin/stores?sortBy=rating&sortOrder=asc`);
    expect(asc.body.data.map((s: { averageRating: number | null }) => s.averageRating)).toEqual([2, 4.5, null]);
    const byName = await admin.get(`${API}/admin/stores?name=bravo`);
    expect(byName.body.meta.totalRecords).toBe(1);
    expect(byName.body.data[0]).toHaveProperty('email');
    const pg = await admin.get(`${API}/admin/stores?limit=2&page=2&sortBy=name`);
    expect(pg.body.data).toHaveLength(1);
    expect(pg.body.meta.totalPages).toBe(2);
    expect((await admin.get(`${API}/admin/stores?sortBy=password`)).status).toBe(422);
    expect((await admin.get(`${API}/admin/stores?unowned=true`)).body.meta.totalRecords).toBe(3);
  });
  it('updates a store and reassigns ownership', async () => {
    const o1 = await makeUser('STORE_OWNER');
    const s = await makeStore({ ownerId: o1.id });
    const upd = await admin.patch(`${API}/admin/stores/${s.id}`).send({ address: 'Updated Address 99' });
    expect(upd.body.data).toMatchObject({ address: 'Updated Address 99', owner: { id: o1.id } });
    const clear = await admin.patch(`${API}/admin/stores/${s.id}`).send({ ownerId: null });
    expect(clear.body.data.owner).toBeNull();
    expect((await admin.patch(`${API}/admin/stores/00000000-0000-4000-8000-000000000000`).send({ address: 'x' })).status).toBe(404);
  });
});
