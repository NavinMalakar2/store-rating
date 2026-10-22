# API reference — `/api/v1`

**Auth:** cookie `srp_token` (HttpOnly) set by `POST /auth/login`. Browsers send it automatically (`credentials: 'include'`).
**CSRF:** every non-GET request must include `X-Requested-With: XMLHttpRequest` (and, if an `Origin` header is sent, it must equal `FRONTEND_URL`).

## Response format
```json
{ "success": true, "message": "…", "data": {}, "meta": { "totalRecords": 12, "currentPage": 1, "pageSize": 10, "totalPages": 2 } }
{ "success": false, "message": "Validation failed", "errors": [ { "field": "name", "message": "Name must be at least 20 characters" } ] }
```
`meta` is present on paginated lists (`data` is the array of items).

| Status | Meaning |
|---|---|
| 200 / 201 | OK / created |
| 400 | malformed JSON, wrong current password |
| 401 | not authenticated / invalid or expired token / bad credentials |
| 403 | wrong role, missing CSRF header, bad origin |
| 404 | resource not found |
| 409 | duplicate (email, rating, owner already has a store) |
| 422 | validation error (body, query or path) |
| 429 | rate limited · 503 database unavailable · 500 unexpected |

## List parameters (all list endpoints)
`page` ≥ 1 (default 1) · `limit` 1–100 (default 10) · `sortOrder` `asc|desc` · `sortBy` (whitelist per endpoint). Ordering is stable (ties broken by `id`). Filters are trimmed, ≤ 100 chars, case-insensitive "contains".

## Auth
| Endpoint | Body | Result |
|---|---|---|
| `POST /auth/register` | `{name,email,address,password}` (role ignored) | 201 user (role USER) · 409 duplicate email |
| `POST /auth/login` | `{email,password}` | 200 user + cookie · 401 |
| `POST /auth/logout` | – | clears cookie |
| `GET /auth/me` | – | `{id,name,email,address,role,createdAt}` |
| `PATCH /auth/password` | `{currentPassword,newPassword}` | 200 · 400 wrong current · 422 policy / same password |

## Admin (ADMIN only)
| Endpoint | Notes |
|---|---|
| `GET /admin/dashboard` | `{totalUsers,totalStores,totalRatings,averageRating,ratingDistribution[5],usersByRole[]}` |
| `GET /admin/users` | filters `search` (name/email/address), `name`, `email`, `address`, `role`, `withoutStore=true`; `sortBy` ∈ name,email,address,role,createdAt |
| `POST /admin/users` | `{name,email,address,password,role, storeId? \| newStore?{name,email,address}}` — store fields only for `STORE_OWNER`; user + store are created in one transaction |
| `GET /admin/users/:id` | detail; owners include `store{…,averageRating,ratingCount}` |
| `PATCH /admin/users/:id` | `name`, `email`, `address` only (roles cannot be changed) |
| `GET /admin/stores` | filters `search` (name/email/address), `name`, `email`, `address`, `unowned=true`; `sortBy` ∈ name,email,address,rating,createdAt,ownerName; items `{id,name,email,address,averageRating,ratingCount,createdAt,owner}` |
| `POST /admin/stores` | `{name,email,address,ownerId?}` — owner must be a STORE_OWNER without a store |
| `GET /admin/stores/:id` · `PATCH /admin/stores/:id` | partial update incl. `ownerId` (nullable) |

## Normal user (USER only)
| Endpoint | Notes |
|---|---|
| `GET /stores` | filters `search` (name or address), `name`, `address`; `sortBy` ∈ name,address,rating,myRating; items `{id,name,address,averageRating,ratingCount,myRating}` (`null` = not rated) |
| `GET /stores/:id` | single store with `myRating` |
| `POST /stores/:storeId/ratings` | `{rating:1..5}` → 201 updated store · 409 already rated · 404 unknown store |
| `PATCH /stores/:storeId/ratings` | `{rating:1..5}` → 200 · 404 if the user has not rated yet |

## Store owner (STORE_OWNER only)
`GET /owner/dashboard` — query `search` (user name/email), `sortBy` ∈ userName,userEmail,rating,createdAt,updatedAt (default `createdAt desc`), pagination.
```json
{ "data": { "store": {"id","name","email","address"} | null,
            "stats": {"averageRating": 4.33, "totalRatings": 3, "distribution": [{"rating":1,"count":0},…]},
            "ratings": [{"id","rating","createdAt","updatedAt","user":{"id","name","email"}}] },
  "meta": { … } }
```
The store is derived from the session; a `storeId` query parameter is ignored. An owner without a store receives `store: null`.

## Other
`GET /health` — `200` when PostgreSQL answers `SELECT 1`, `503` otherwise.
