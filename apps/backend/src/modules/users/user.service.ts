import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../errors/AppError';
import { rethrowUnique } from '../../errors/prismaErrors';
import { createUser, safeUserSelect } from '../auth/auth.service';

export interface UserListQuery {
  page: number;
  limit: number;
  sortBy: 'name' | 'email' | 'address' | 'role' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  search?: string;
  name?: string;
  email?: string;
  address?: string;
  role?: Role;
  withoutStore?: boolean;
}

const contains = (v: string) => ({ contains: v, mode: 'insensitive' as const });

export async function listUsers(q: UserListQuery) {
  const and: Prisma.UserWhereInput[] = [];
  if (q.role) and.push({ role: q.role });
  if (q.withoutStore) and.push({ store: { is: null } });
  if (q.name) and.push({ name: contains(q.name) });
  if (q.email) and.push({ email: contains(q.email) });
  if (q.address) and.push({ address: contains(q.address) });
  if (q.search) and.push({ OR: [{ name: contains(q.search) }, { email: contains(q.search) }, { address: contains(q.search) }] });
  const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...safeUserSelect, store: { select: { id: true, name: true } } },
      orderBy: [{ [q.sortBy]: q.sortOrder }, { id: 'asc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...safeUserSelect, store: { select: { id: true, name: true, email: true, address: true } } },
  });
  if (!user) throw AppError.notFound('User not found');

  let store = null;
  if (user.store) {
    const agg = await prisma.rating.aggregate({ where: { storeId: user.store.id }, _avg: { rating: true }, _count: { _all: true } });
    store = { ...user.store, averageRating: agg._avg.rating === null ? null : round2(agg._avg.rating), ratingCount: agg._count._all };
  }
  return { ...user, store };
}

interface CreateInput {
  name: string;
  email: string;
  address: string;
  password: string;
  role: Role;
  storeId?: string;
  newStore?: { name: string; email: string; address: string };
}

/** Creates the user (and the store association) atomically — nothing is left half-created on failure. */
export async function createUserWithStore(input: CreateInput) {
  const { storeId, newStore, ...userData } = input;
  const id = await prisma.$transaction(async (tx) => {
    const user = await createUser(userData, tx);

    if (storeId) {
      const store = await tx.store.findUnique({ where: { id: storeId }, select: { ownerId: true } });
      if (!store) throw AppError.notFound('Store not found');
      if (store.ownerId) throw AppError.conflict('This store already has an owner', [{ field: 'storeId', message: 'This store already has an owner' }]);
      await tx.store.update({ where: { id: storeId }, data: { ownerId: user.id } });
    } else if (newStore) {
      try {
        await tx.store.create({ data: { ...newStore, ownerId: user.id } });
      } catch (e) {
        rethrowUnique(e, { email: 'A store with this email already exists' }, 'A store with these details already exists');
      }
    }
    return user.id;
  });
  return getUserDetail(id);
}

export async function updateUser(id: string, data: { name?: string; email?: string; address?: string }) {
  try {
    await prisma.user.update({ where: { id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw AppError.notFound('User not found');
    rethrowUnique(e, { email: 'An account with this email already exists' }, 'An account with this email already exists');
  }
  return getUserDetail(id);
}
