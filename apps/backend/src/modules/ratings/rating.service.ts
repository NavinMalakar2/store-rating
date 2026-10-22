import { prisma } from '../../database/prisma';
import { AppError } from '../../errors/AppError';
import { uniqueFields } from '../../errors/prismaErrors';
import { getDirectoryStore } from '../stores/store.service';

async function assertStoreExists(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
  if (!store) throw AppError.notFound('Store not found');
}

export async function submitRating(userId: string, storeId: string, rating: number) {
  await assertStoreExists(storeId);
  try {
    await prisma.rating.create({ data: { userId, storeId, rating } });
  } catch (e) {
    // The UNIQUE(userId, storeId) constraint also protects against concurrent duplicate submissions.
    if (uniqueFields(e) !== null) {
      throw AppError.conflict('You have already rated this store. Update your existing rating instead.');
    }
    throw e;
  }
  return getDirectoryStore(storeId, userId);
}

export async function updateRating(userId: string, storeId: string, rating: number) {
  await assertStoreExists(storeId);
  const existing = await prisma.rating.findUnique({ where: { userId_storeId: { userId, storeId } }, select: { id: true } });
  if (!existing) throw AppError.notFound('You have not rated this store yet. Submit a rating first.');
  await prisma.rating.update({ where: { id: existing.id }, data: { rating } });
  return getDirectoryStore(storeId, userId);
}
