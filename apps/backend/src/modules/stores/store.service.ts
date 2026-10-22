import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../errors/AppError';
import { rethrowUnique } from '../../errors/prismaErrors';
import { findStoreRow, queryStores, StoreQuery, StoreRow } from './store.repository';

const OWNER_CONFLICT = 'This owner is already associated with another store';
const UNIQUE_MESSAGES = { email: 'A store with this email already exists', ownerId: OWNER_CONFLICT };

/** What normal users may see (no e-mail / owner details). */
export const toDirectoryStore = (r: StoreRow) => ({
  id: r.id,
  name: r.name,
  address: r.address,
  averageRating: r.averageRating,
  ratingCount: r.ratingCount,
  myRating: r.myRating,
});

export const toAdminStore = (r: StoreRow) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  address: r.address,
  averageRating: r.averageRating,
  ratingCount: r.ratingCount,
  createdAt: r.createdAt,
  owner: r.ownerId ? { id: r.ownerId, name: r.ownerName, email: r.ownerEmail } : null,
});

export async function listDirectory(query: StoreQuery) {
  const { rows, total } = await queryStores(query);
  return { items: rows.map(toDirectoryStore), total };
}

export async function getDirectoryStore(id: string, viewerId: string) {
  const row = await findStoreRow(id, viewerId);
  if (!row) throw AppError.notFound('Store not found');
  return toDirectoryStore(row);
}

export async function listAdminStores(query: StoreQuery) {
  const { rows, total } = await queryStores(query);
  return { items: rows.map(toAdminStore), total };
}

export async function getAdminStore(id: string) {
  const row = await findStoreRow(id);
  if (!row) throw AppError.notFound('Store not found');
  return toAdminStore(row);
}

/** Owner must exist, be a STORE_OWNER and not already own another store. */
async function assertAssignableOwner(ownerId: string, db: Prisma.TransactionClient, exceptStoreId?: string) {
  const owner = await db.user.findUnique({ where: { id: ownerId }, include: { store: { select: { id: true } } } });
  if (!owner) throw AppError.notFound('Owner not found');
  if (owner.role !== Role.STORE_OWNER) {
    throw AppError.unprocessable('Only users with the Store Owner role can own a store', [
      { field: 'ownerId', message: 'Selected user is not a store owner' },
    ]);
  }
  if (owner.store && owner.store.id !== exceptStoreId) {
    throw AppError.conflict(OWNER_CONFLICT, [{ field: 'ownerId', message: OWNER_CONFLICT }]);
  }
}

export async function createStore(data: { name: string; email: string; address: string; ownerId?: string | null }) {
  const id = await prisma.$transaction(async (tx) => {
    if (data.ownerId) await assertAssignableOwner(data.ownerId, tx);
    try {
      const store = await tx.store.create({
        data: { name: data.name, email: data.email, address: data.address, ownerId: data.ownerId ?? null },
        select: { id: true },
      });
      return store.id;
    } catch (e) {
      rethrowUnique(e, UNIQUE_MESSAGES, 'A store with these details already exists');
    }
  });
  return getAdminStore(id);
}

export async function updateStore(
  id: string,
  data: { name?: string; email?: string; address?: string; ownerId?: string | null },
) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.store.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw AppError.notFound('Store not found');
    if (data.ownerId) await assertAssignableOwner(data.ownerId, tx, id);
    try {
      await tx.store.update({ where: { id }, data });
    } catch (e) {
      rethrowUnique(e, UNIQUE_MESSAGES, 'A store with these details already exists');
    }
  });
  return getAdminStore(id);
}
