# StoreRate — Store Rating Platform

A full-stack web app where registered users rate stores from **1 to 5**. One shared login serves three roles — **System Administrator**, **Normal User** and **Store Owner** — and each role gets its own dashboard and permissions.

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS · TanStack Query / Table · React Hook Form + Zod · Recharts · Express 4 + TypeScript · Prisma 6 · PostgreSQL · JWT (HttpOnly cookie) · bcryptjs · Helmet · express-rate-limit · Vitest + Supertest + React Testing Library.

## Features

- **Auth (all roles):** public signup (normal users only), shared login (no role picker), logout, change password, JWT in an HttpOnly SameSite cookie, CSRF header + origin check, rate-limited auth endpoints.
- **Administrator:** dashboard (total users / stores / ratings, distribution chart); create users of any role; create stores and attach owners (atomic "owner + new store" workflow); user list, details (owner → store + average rating) and store list with **backend** search, filters, sorting and pagination.
- **Normal user:** browse all stores, search by name/address, see overall rating + own rating, submit and update a rating (1–5), change password.
- **Store owner:** dashboard for *their own* store only: average, total, 1–5 distribution, paginated/sortable/searchable table of raters with submitted/updated dates.
- **Integrity:** `UNIQUE(userId, storeId)`, `CHECK (rating BETWEEN 1 AND 5)`, owner-must-be-STORE_OWNER and rater-must-be-USER triggers, FK cascade rules, transactional multi-step writes.

## Prerequisites

- Node.js **20+** (developed on 22) and npm 10+
- PostgreSQL **14+** (developed on 16)

## Quick start

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Create the PostgreSQL role + databases (psql as a superuser)
#    CREATE USER store WITH PASSWORD 'store_pw' CREATEDB;
#    CREATE DATABASE store_rating      OWNER store;
#    CREATE DATABASE store_rating_test OWNER store;   -- used only by automated tests

# 3. Configure environment
cp .env.example .env        # Windows: copy .env.example .env
#    then edit .env: DATABASE_URL, TEST_DATABASE_URL and a long random JWT_SECRET

# 4. Generate Prisma client, apply migrations, seed demo data
npm run db:generate
npm run db:deploy
npm run db:seed

# 5. Run API (http://localhost:4000) and web app (http://localhost:5173) together
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to the backend, so the auth cookie stays same-origin.

> Detailed instructions, Windows notes and troubleshooting: [docs/setup-guide.md](docs/setup-guide.md).

## Demo accounts (local development only — created by `npm run db:seed`)

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@storerating.dev` | `Admin@123` |
| Normal user | `rahul@storerating.dev` | `Rahul@123` |
| Normal user | `priya@storerating.dev` | `User@1234` |
| Normal user | `amit@storerating.dev` | `User@1234` |
| Store owner (Sunrise Fresh Groceries and More) | `sunita.owner@storerating.dev` | `Owner@123` |
| Store owner (Vikram Electronics and Gadgets Hub) | `vikram.owner@storerating.dev` | `Owner@123` |

The seed is idempotent (upserts) — safe to re-run. **Never use these credentials outside local development.**

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `dev:backend` / `dev:frontend` | Start API + web / only one of them |
| `npm run build` | Type-check + build backend (`dist/`) and frontend (`apps/frontend/dist`) |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript for both apps |
| `npm test` · `test:backend` · `test:frontend` | Vitest suites (backend needs `TEST_DATABASE_URL`) |
| `npm run smoke` | Live end-to-end HTTP check against a *running* stack (needs seed data) |
| `npm run db:generate` · `db:migrate` · `db:deploy` · `db:seed` · `db:setup` | Prisma client · create a new migration (dev) · apply migrations · seed · generate+deploy+seed |

## Project structure

```
apps/
  backend/   Express API  — src/{config,middleware,modules/{auth,users,stores,ratings,admin,owner},routes,errors,utils,validation,database}
             prisma/ (schema.prisma, migrations/, seed.ts) · tests/ (unit + integration) · scripts/smoke.mjs
  frontend/  React SPA    — src/{app/{providers,router,layouts},components/{ui,common,tables,feedback},features/*,hooks,lib,services,types}
docs/        architecture · api-documentation · database-design · setup-guide
```
Request flow: `Page → feature hook (TanStack Query) → service → fetch → Express route → authenticate → authorize → validate (Zod) → controller → service → Prisma/SQL → PostgreSQL`.

## Role & permission matrix

| Capability | Admin | User | Store owner | Anonymous |
|---|:--:|:--:|:--:|:--:|
| Register (creates USER) / Login | ✔ | ✔ | ✔ | ✔ |
| Change own password | ✔ | ✔ | ✔ | ✘ |
| Admin dashboard, create users/stores, list/detail users & stores | ✔ | ✘ | ✘ | ✘ |
| Browse/search store directory | ✘ | ✔ | ✘ | ✘ |
| Submit / update own rating | ✘ | ✔ | ✘ | ✘ |
| Own-store dashboard + raters list | ✘ | ✘ | ✔ (own store only) | ✘ |

Enforced on the **server** for every route; frontend guards only hide UI.

## API summary (`/api/v1`, JSON envelope `{success,message,data,meta?}` / `{success:false,message,errors[]}`)

| Method & path | Role | Notes |
|---|---|---|
| `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/password` | public / any | |
| `GET /admin/dashboard` | ADMIN | totals + distribution |
| `GET/POST /admin/users` · `GET/PATCH /admin/users/:id` | ADMIN | filters `search,name,email,address,role,withoutStore`; sort `name,email,address,role,createdAt` |
| `GET/POST /admin/stores` · `GET/PATCH /admin/stores/:id` | ADMIN | filters `search,name,email,address,unowned`; sort `name,email,address,rating,createdAt,ownerName` |
| `GET /stores` · `GET /stores/:id` | USER | filters `search,name,address`; sort `name,address,rating,myRating` |
| `POST /stores/:storeId/ratings` · `PATCH /stores/:storeId/ratings` | USER | body `{rating:1..5}`; 409 on duplicate, 404 on update-without-rating |
| `GET /owner/dashboard` | STORE_OWNER | `search`, sort `userName,userEmail,rating,createdAt,updatedAt`; store derived from session |

All lists take `page` (≥1), `limit` (1–100), `sortOrder` (`asc|desc`) and return `meta: {totalRecords,currentPage,pageSize,totalPages}`. Full reference: [docs/api-documentation.md](docs/api-documentation.md).

## Rating rules

- Overall rating = `AVG(rating)` over persisted ratings, computed in PostgreSQL, **rounded to 2 decimals**; no ratings → `null` → UI shows **“Not rated yet”**.
- One rating per (user, store): enforced by the service *and* a database unique index; concurrent duplicate submits → exactly one `201`, the rest `409`.
- Only normal users can rate; the user id always comes from the session.
- “Total users” on the admin dashboard counts **all** accounts (admins + users + owners).

## Validation rules (frontend Zod + backend Zod; backend is authoritative)

| Field | Rule |
|---|---|
| Name (users & stores) | trimmed, 20–60 chars |
| Address | trimmed, required, ≤ 400 chars |
| Password | 8–16 chars, ≥ 1 uppercase, ≥ 1 special character |
| Email | valid format, trimmed + lower-cased, unique |
| Rating | integer 1–5 (decimals, strings, null, out-of-range rejected) |
| Query params | `page ≥ 1`, `limit ≤ 100`, whitelisted `sortBy`, `sortOrder ∈ {asc,desc}`, filters ≤ 100 chars |

## Testing

- **Backend** (94 tests): unit (validation, pagination, rating helpers, RBAC middleware) + integration with Supertest on an isolated PostgreSQL DB (auth, JWT forgery, CSRF, admin CRUD/filters/sorting, rating flows incl. concurrency, DB constraints/triggers, owner isolation).
- **Frontend** (37 tests): login/logout transitions, login/signup/password forms, route protection, role-specific navigation, store search, rating submit/modify, error and empty states.
- `npm run smoke`: 28 live HTTP checks across the whole stack.

The backend test setup **drops and recreates the `public` schema of `TEST_DATABASE_URL`** and refuses to run unless that database name contains `test`.

## Troubleshooting

See [docs/setup-guide.md#troubleshooting](docs/setup-guide.md#troubleshooting). Common ones: `Invalid or missing environment configuration` (copy `.env.example` → `.env`), `Cannot connect to PostgreSQL` (service not running / wrong `DATABASE_URL`), `@prisma/client did not initialize` (run `npm run db:generate`), `403 Missing CSRF protection header` (custom API clients must send `X-Requested-With: XMLHttpRequest`).
