import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/database/prisma';
import { anon, API, app, loginAs, makeUser, PW, resetDb } from '../helpers';

const valid = { name: 'Rahul Sharma Test Customer', email: 'New.User@Test.dev', address: '1 Road', password: 'Valid@123' };

beforeEach(resetDb);

describe('registration', () => {
  it('creates a normal user, normalizes email and never returns the hash', async () => {
    const res = await anon().post(`${API}/auth/register`).send({ ...valid, role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: 'new.user@test.dev', role: 'USER' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Valid@123/);
    const row = await prisma.user.findUniqueOrThrow({ where: { email: 'new.user@test.dev' } });
    expect(row.passwordHash).not.toBe('Valid@123');
    expect(row.role).toBe('USER');
  });
  it('rejects duplicate emails (case-insensitive) with 409', async () => {
    await anon().post(`${API}/auth/register`).send(valid);
    const res = await anon().post(`${API}/auth/register`).send({ ...valid, email: 'NEW.user@test.dev' });
    expect(res.status).toBe(409);
  });
  it.each([
    ['short name', { name: 'Too short' }, 'name'],
    ['long address', { address: 'x'.repeat(401) }, 'address'],
    ['weak password', { password: 'weakpass' }, 'password'],
    ['bad email', { email: 'nope' }, 'email'],
  ])('422 for %s', async (_l, patch, field) => {
    const res = await anon().post(`${API}/auth/register`).send({ ...valid, ...patch });
    expect(res.status).toBe(422);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(field);
  });
  it('rejects requests without the CSRF header', async () => {
    const res = await request(app).post(`${API}/auth/register`).send(valid);
    expect(res.status).toBe(403);
  });
});

describe('login / session', () => {
  it('logs in, sets an HttpOnly cookie and /me returns the server-side role', async () => {
    const u = await makeUser('STORE_OWNER');
    const agent = anon();
    const res = await agent.post(`${API}/auth/login`).send({ email: u.email.toUpperCase(), password: PW });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(res.headers['set-cookie'][0]).toMatch(/SameSite=Lax/i);
    expect(res.body.data.role).toBe('STORE_OWNER');
    const me = await agent.get(`${API}/auth/me`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(u.email);
    expect(me.body.data).not.toHaveProperty('passwordHash');
  });
  it('same generic 401 for wrong password and unknown email', async () => {
    const u = await makeUser('USER');
    const a = await anon().post(`${API}/auth/login`).send({ email: u.email, password: 'Wrong@123' });
    const b = await anon().post(`${API}/auth/login`).send({ email: 'ghost@test.dev', password: PW });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });
  it('protected routes require authentication; logout clears the session', async () => {
    expect((await anon().get(`${API}/auth/me`)).status).toBe(401);
    const u = await makeUser('USER');
    const agent = await loginAs(u.email);
    expect((await agent.post(`${API}/auth/logout`)).status).toBe(200);
    expect((await agent.get(`${API}/auth/me`)).status).toBe(401);
  });
  it('rejects forged, tampered and expired tokens', async () => {
    const u = await makeUser('ADMIN');
    const secret = process.env.JWT_SECRET!;
    const cookie = (t: string) => [`srp_token=${t}`];
    const expired = jwt.sign({ sub: u.id, role: 'ADMIN' }, secret, { issuer: 'store-rating-platform', expiresIn: -10 });
    const wrongSecret = jwt.sign({ sub: u.id, role: 'ADMIN' }, 'x'.repeat(40), { issuer: 'store-rating-platform' });
    const wrongIssuer = jwt.sign({ sub: u.id, role: 'ADMIN' }, secret, { issuer: 'evil' });
    for (const t of [expired, wrongSecret, wrongIssuer, 'garbage']) {
      const res = await request(app).get(`${API}/auth/me`).set('Cookie', cookie(t));
      expect(res.status).toBe(401);
    }
  });
  it('role in the token is ignored — the database role wins', async () => {
    const u = await makeUser('USER');
    const t = jwt.sign({ sub: u.id, role: 'ADMIN' }, process.env.JWT_SECRET!, { issuer: 'store-rating-platform' });
    const res = await request(app).get(`${API}/admin/dashboard`).set('Cookie', [`srp_token=${t}`]);
    expect(res.status).toBe(403);
  });
});

describe('password change', () => {
  it('verifies the current password, enforces the policy and applies the new password', async () => {
    const u = await makeUser('USER');
    const agent = await loginAs(u.email);
    const bad = await agent.patch(`${API}/auth/password`).send({ currentPassword: 'Nope@1234', newPassword: 'Newpass@1' });
    expect(bad.status).toBe(400);
    const weak = await agent.patch(`${API}/auth/password`).send({ currentPassword: PW, newPassword: 'weak' });
    expect(weak.status).toBe(422);
    const same = await agent.patch(`${API}/auth/password`).send({ currentPassword: PW, newPassword: PW });
    expect(same.status).toBe(422);
    const ok = await agent.patch(`${API}/auth/password`).send({ currentPassword: PW, newPassword: 'Newpass@1' });
    expect(ok.status).toBe(200);
    expect((await anon().post(`${API}/auth/login`).send({ email: u.email, password: PW })).status).toBe(401);
    expect((await anon().post(`${API}/auth/login`).send({ email: u.email, password: 'Newpass@1' })).status).toBe(200);
  });
  it('requires authentication', async () => {
    expect((await anon().patch(`${API}/auth/password`).send({ currentPassword: 'a', newPassword: 'Newpass@1' })).status).toBe(401);
  });
});

describe('misc', () => {
  it('malformed JSON -> 400, unknown route -> 404, health ok', async () => {
    const bad = await request(app).post(`${API}/auth/login`).set('X-Requested-With', 'XMLHttpRequest').set('Content-Type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
    expect((await request(app).get(`${API}/nope`)).status).toBe(404);
    expect((await request(app).get(`${API}/health`)).status).toBe(200);
  });
});
