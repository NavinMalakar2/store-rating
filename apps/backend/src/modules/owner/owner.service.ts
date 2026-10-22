import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { averageOf, buildDistribution } from '../../utils/ratings';

export interface OwnerRatingsQuery {
  page: number;
  limit: number;
  sortBy: 'userName' | 'userEmail' | 'rating' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  search?: string;
}

function orderBy(q: OwnerRatingsQuery): Prisma.RatingOrderByWithRelationInput[] {
  const dir = q.sortOrder;
  const primary: Prisma.RatingOrderByWithRelationInput =
    q.sortBy === 'userName' ? { user: { name: dir } } : q.sortBy === 'userEmail' ? { user: { email: dir } } : { [q.sortBy]: dir };
  return [primary, { id: 'asc' }];
}

/**
 * The store is derived from the authenticated owner's id (Store.ownerId) — a store id is never
 * accepted from the client, so one owner can never read another owner's data.
 */
export async function getOwnerDashboard(ownerId: string, q: OwnerRatingsQuery) {
  const store = await prisma.store.findUnique({
    where: { ownerId },
    select: { id: true, name: true, email: true, address: true },
  });
  if (!store) {
    return {
      store: null,
      stats: { averageRating: null, totalRatings: 0, distribution: buildDistribution([]) },
      ratings: [] as never[],
      total: 0,
    };
  }

  const where: Prisma.RatingWhereInput = {
    storeId: store.id,
    ...(q.search
      ? { user: { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { email: { contains: q.search, mode: 'insensitive' } }] } }
      : {}),
  };

  const [agg, groups, total, rows] = await Promise.all([
    prisma.rating.aggregate({ where: { storeId: store.id }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.rating.groupBy({ by: ['rating'], where: { storeId: store.id }, _count: { _all: true } }),
    prisma.rating.count({ where }),
    prisma.rating.findMany({
      where,
      select: { id: true, rating: true, createdAt: true, updatedAt: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: orderBy(q),
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);

  return {
    store,
    stats: {
      averageRating: averageOf(agg._avg.rating),
      totalRatings: agg._count._all,
      distribution: buildDistribution(groups.map((g) => ({ rating: g.rating, count: g._count._all }))),
    },
    ratings: rows,
    total,
  };
}
