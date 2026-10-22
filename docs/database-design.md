# Database design (PostgreSQL via Prisma)

```
User 1 ──── 0..1 Store        (Store.ownerId UNIQUE, nullable, ON DELETE SET NULL)
User 1 ──── * Rating * ──── 1 Store   (ON DELETE CASCADE both sides)
```

| Table | Columns | Notes |
|---|---|---|
| `User` | `id uuid PK`, `name`, `email UNIQUE`, `address`, `passwordHash`, `role enum(ADMIN,USER,STORE_OWNER)`, `createdAt`, `updatedAt` | indexes: `role`, `name`, `createdAt` |
| `Store` | `id uuid PK`, `name`, `email UNIQUE`, `address`, `ownerId uuid UNIQUE NULL → User`, timestamps | one primary owner per store, at most one store per owner; indexes `name`, `createdAt` |
| `Rating` | `id uuid PK`, `userId → User`, `storeId → Store`, `rating int`, timestamps | **UNIQUE(userId, storeId)**; **CHECK (rating BETWEEN 1 AND 5)**; indexes `(storeId, rating)`, `(storeId, createdAt)` |

## Database-level rules (migration `integrity_constraints`)
1. `Rating_rating_range_chk` — rating 1..5.
2. Trigger `Store_owner_role_trg` — `Store.ownerId` must reference a `STORE_OWNER` user.
3. Trigger `Rating_user_role_trg` — only `USER` accounts can have ratings.
4. Trigger `User_role_change_trg` — a user that owns a store or has ratings cannot change role.

## Derived values
No stored averages. Store rating = `ROUND(AVG(rating)::numeric, 2)` and count are computed per query with `LEFT JOIN "Rating"` + `GROUP BY`; the viewer's own rating uses a correlated sub-select on `(storeId, userId)` (served by the unique index). Admin dashboard uses `COUNT`, `AVG` and `GROUP BY` aggregates.

## Emails
Lower-cased and trimmed by the API before every read/write; uniqueness enforced by the unique indexes (case differences cannot slip through).

## Seed
`prisma/seed.ts` upserts 6 users, 4 stores (2 owned) and 6 ratings by natural keys (email, `(userId, storeId)`), so re-running never duplicates data.
