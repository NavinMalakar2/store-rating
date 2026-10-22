import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';

export const STORE_SORT_FIELDS = ['name', 'email', 'address', 'rating', 'createdAt', 'ownerName', 'myRating'] as const;
export type StoreSortField = (typeof STORE_SORT_FIELDS)[number];

// Whitelist: user input only ever selects one of these literals (never interpolated).
const SORT_SQL: Record<StoreSortField, string> = {
  name: 's."name"',
  email: 's."email"',
  address: 's."address"',
  rating: '"averageRating"',
  createdAt: 's."createdAt"',
  ownerName: 'u."name"',
  myRating: '"myRating"',
};

export interface StoreFilters {
  id?: string;
  search?: string;
  name?: string;
  email?: string;
  address?: string;
  unowned?: boolean;
}

export interface StoreQuery extends StoreFilters {
  sortBy: StoreSortField;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
  viewerId?: string;
}

export interface StoreRow {
  id: string;
  name: string;
  email: string;
  address: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: Date;
  averageRating: number | null;
  ratingCount: number;
  myRating: number | null;
}

const like = (v: string) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;

function buildWhere(f: StoreFilters): Prisma.Sql {
  const c: Prisma.Sql[] = [];
  if (f.id) c.push(Prisma.sql`s."id" = ${f.id}::uuid`);
  if (f.name) c.push(Prisma.sql`s."name" ILIKE ${like(f.name)}`);
  if (f.email) c.push(Prisma.sql`s."email" ILIKE ${like(f.email)}`);
  if (f.address) c.push(Prisma.sql`s."address" ILIKE ${like(f.address)}`);
  if (f.unowned) c.push(Prisma.sql`s."ownerId" IS NULL`);
  if (f.search) {
    const p = like(f.search);
    c.push(Prisma.sql`(s."name" ILIKE ${p} OR s."address" ILIKE ${p} OR s."email" ILIKE ${p})`);
  }
  return c.length ? Prisma.sql`WHERE ${Prisma.join(c, ' AND ')}` : Prisma.empty;
}

/** One aggregated query (no N+1): average, count and the viewer's own rating computed in PostgreSQL. */
export async function queryStores(q: StoreQuery): Promise<{ rows: StoreRow[]; total: number }> {
  const where = buildWhere(q);
  const dir = Prisma.raw(q.sortOrder === 'desc' ? 'DESC' : 'ASC');
  const orderCol = Prisma.raw(SORT_SQL[q.sortBy]);
  const myRating = q.viewerId
    ? Prisma.sql`(SELECT mr."rating" FROM "Rating" mr WHERE mr."storeId" = s."id" AND mr."userId" = ${q.viewerId}::uuid)`
    : Prisma.sql`NULL::int`;

  const [rows, count] = await Promise.all([
    prisma.$queryRaw<StoreRow[]>`
      SELECT s."id", s."name", s."email", s."address", s."ownerId", s."createdAt",
             u."name" AS "ownerName", u."email" AS "ownerEmail",
             ROUND(AVG(r."rating")::numeric, 2)::float8 AS "averageRating",
             COUNT(r."id")::int AS "ratingCount",
             ${myRating} AS "myRating"
      FROM "Store" s
      LEFT JOIN "User" u ON u."id" = s."ownerId"
      LEFT JOIN "Rating" r ON r."storeId" = s."id"
      ${where}
      GROUP BY s."id", u."id"
      ORDER BY ${orderCol} ${dir} NULLS LAST, s."id" ASC
      LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`,
    prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "Store" s ${where}`,
  ]);
  return { rows, total: count[0]?.count ?? 0 };
}

export async function findStoreRow(id: string, viewerId?: string): Promise<StoreRow | null> {
  const { rows } = await queryStores({ id, sortBy: 'name', sortOrder: 'asc', page: 1, limit: 1, viewerId });
  return rows[0] ?? null;
}
