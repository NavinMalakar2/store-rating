import { prisma } from '../../database/prisma';
import { averageOf, buildDistribution } from '../../utils/ratings';

/** "Total users" counts every account (admins, normal users and store owners). */
export async function getAdminDashboard() {
  const [totalUsers, totalStores, ratingAgg, groups, byRole] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.rating.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    prisma.rating.groupBy({ by: ['rating'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
  ]);
  return {
    totalUsers,
    totalStores,
    totalRatings: ratingAgg._count._all,
    averageRating: averageOf(ratingAgg._avg.rating),
    ratingDistribution: buildDistribution(groups.map((g) => ({ rating: g.rating, count: g._count._all }))),
    usersByRole: byRole.map((r) => ({ role: r.role, count: r._count._all })),
  };
}
