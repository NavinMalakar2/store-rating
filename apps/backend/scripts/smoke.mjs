// Live end-to-end smoke test against a RUNNING stack (API + PostgreSQL), no mocks.
// Usage: npm run smoke            (defaults to the Vite dev proxy at http://localhost:5173)
//        SMOKE_BASE=http://localhost:4000 npm run smoke
// Requires the seeded demo data (npm run db:seed). Creates uniquely named records on every run.
const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
const BASE = (process.env.SMOKE_BASE || ORIGIN) + '/api/v1';
let passed = 0, failed = 0;

function client() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json, setCookie: set.join('|') };
  };
}
const check = (name, cond, extra = '') => { if (cond) passed++; else failed++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  -> ' + extra}`); };

const run = Date.now().toString().slice(-8);
const admin = client(), user = client(), owner = client(), anon = client();

let r = await anon('GET', '/health');
check('health (DB reachable)', r.status === 200, JSON.stringify(r.body));
r = await anon('GET', '/stores');
check('unauthenticated /stores -> 401', r.status === 401);

r = await admin('POST', '/auth/login', { email: 'admin@storerating.dev', password: 'Admin@123' });
check('admin login + HttpOnly cookie', r.status === 200 && /HttpOnly/i.test(r.setCookie) && r.body.data.role === 'ADMIN', JSON.stringify(r.body));
r = await admin('GET', '/admin/dashboard');
check('admin dashboard counts from DB', r.status === 200 && r.body.data.totalUsers >= 6 && r.body.data.totalStores >= 4, JSON.stringify(r.body));

const storeBody = { name: `Smoke Test Store Number ${run} Ltd`, email: `smoke${run}@store.example`, address: `${run} Smoke Street, Indore` };
r = await admin('POST', '/admin/users', { name: `Smoke Owner Account Number ${run}`, email: `owner${run}@smoke.dev`, address: '1 Owner Rd', password: 'Owner@123', role: 'STORE_OWNER', newStore: storeBody });
check('admin creates store owner + store atomically', r.status === 201 && r.body.data.store?.name === storeBody.name, JSON.stringify(r.body));
const storeId = r.body.data?.store?.id;

r = await anon('POST', '/auth/register', { name: `Smoke Customer Account Number ${run}`, email: `cust${run}@smoke.dev`, address: '2 Customer Rd', password: 'Cust@1234', role: 'ADMIN' });
check('public signup creates USER only (role ignored)', r.status === 201 && r.body.data.role === 'USER', JSON.stringify(r.body));
r = await user('POST', '/auth/login', { email: `cust${run}@smoke.dev`, password: 'Cust@1234' });
check('user login', r.status === 200 && r.body.data.role === 'USER');

r = await user('GET', `/stores?search=${encodeURIComponent('Smoke Test Store Number ' + run)}`);
check('directory search (backend) finds the store, unrated', r.status === 200 && r.body.data.length === 1 && r.body.data[0].averageRating === null && r.body.data[0].myRating === null, JSON.stringify(r.body));
r = await user('POST', `/stores/${storeId}/ratings`, { rating: 4 });
check('submit rating 4', r.status === 201 && r.body.data.myRating === 4 && r.body.data.averageRating === 4, JSON.stringify(r.body));
r = await user('POST', `/stores/${storeId}/ratings`, { rating: 5 });
check('duplicate rating -> 409', r.status === 409);
r = await user('PATCH', `/stores/${storeId}/ratings`, { rating: 2 });
check('update rating to 2', r.status === 200 && r.body.data.myRating === 2 && r.body.data.averageRating === 2, JSON.stringify(r.body));
for (const bad of [0, 6, 3.5, '3', null]) {
  r = await user('PATCH', `/stores/${storeId}/ratings`, { rating: bad });
  check(`invalid rating ${JSON.stringify(bad)} -> 422`, r.status === 422);
}
r = await user('GET', '/admin/users');
check('USER cannot call admin API -> 403', r.status === 403);
r = await admin('POST', `/stores/${storeId}/ratings`, { rating: 3 });
check('ADMIN cannot rate -> 403', r.status === 403);

r = await owner('POST', '/auth/login', { email: `owner${run}@smoke.dev`, password: 'Owner@123' });
check('store owner login', r.status === 200 && r.body.data.role === 'STORE_OWNER');
r = await owner('GET', '/owner/dashboard');
check('owner dashboard: own store, avg 2, total 1, user listed', r.status === 200 && r.body.data.store.id === storeId && r.body.data.stats.averageRating === 2 && r.body.data.stats.totalRatings === 1 && r.body.data.ratings[0].user.email === `cust${run}@smoke.dev`, JSON.stringify(r.body));
r = await owner('GET', `/owner/dashboard?storeId=00000000-0000-4000-8000-000000000000`);
check('owner cannot choose another store via query', r.status === 200 && r.body.data.store.id === storeId);
r = await owner('GET', '/admin/dashboard');
check('owner cannot call admin API -> 403', r.status === 403);

r = await admin('GET', '/admin/stores?sortBy=rating&sortOrder=desc&limit=2&page=1');
check('admin stores: backend sort+pagination', r.status === 200 && r.body.data.length <= 2 && r.body.meta.pageSize === 2, JSON.stringify(r.body.meta));
r = await admin('GET', '/admin/users?role=STORE_OWNER&sortBy=email&sortOrder=asc');
check('admin users: role filter + sort', r.status === 200 && r.body.data.every((u) => u.role === 'STORE_OWNER'));
r = await admin('GET', '/admin/users?sortBy=passwordHash');
check('invalid sort field -> 422', r.status === 422);
r = await user('PATCH', '/auth/password', { currentPassword: 'Cust@1234', newPassword: 'Cust@5678' });
check('password change', r.status === 200);
r = await anon('POST', '/auth/login', { email: `cust${run}@smoke.dev`, password: 'Cust@1234' });
check('old password rejected after change', r.status === 401);
r = await user('POST', '/auth/logout');
r = await user('GET', '/auth/me');
check('logout clears session', r.status === 401);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
