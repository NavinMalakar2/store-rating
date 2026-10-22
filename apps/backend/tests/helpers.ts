import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/database/prisma';

export const app = createApp();
export const API = '/api/v1';
export const PW = 'Passw0rd!x';
let seq = 0;

export async function resetDb() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Rating","Store","User" RESTART IDENTITY CASCADE');
}

export const uniq = () => `${Date.now()}${++seq}`;

export async function makeUser(role: Role, overrides: Partial<{ name: string; email: string; address: string }> = {}) {
  const n = uniq();
  return prisma.user.create({
    data: {
      name: overrides.name ?? `Test ${role} Person Number ${n}`.slice(0, 60).padEnd(20, 'x'),
      email: overrides.email ?? `u${n}@test.dev`,
      address: overrides.address ?? `${n} Test Street`,
      role,
      passwordHash: await bcrypt.hash(PW, 4),
    },
  });
}

export async function makeStore(opts: { ownerId?: string | null; name?: string; address?: string } = {}) {
  const n = uniq();
  return prisma.store.create({
    data: {
      name: opts.name ?? `Test Store Number ${n} Limited`.padEnd(20, 'x'),
      email: `s${n}@store.test`,
      address: opts.address ?? `${n} Market Road`,
      ownerId: opts.ownerId ?? null,
    },
  });
}

/** Supertest agent that keeps the auth cookie and always sends the CSRF header. */
export async function loginAs(email: string, password = PW) {
  const agent = request.agent(app);
  agent.set('X-Requested-With', 'XMLHttpRequest');
  const res = await agent.post(`${API}/auth/login`).send({ email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export function anon() {
  const agent = request.agent(app);
  agent.set('X-Requested-With', 'XMLHttpRequest');
  return agent;
}
