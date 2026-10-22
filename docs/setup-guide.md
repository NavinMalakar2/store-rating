# Setup guide

## 1. Requirements
- Node.js ≥ 20, npm ≥ 10
- PostgreSQL ≥ 14 running locally (or reachable)
- Internet access on first `npm install` / `prisma generate` / `prisma migrate` (Prisma downloads its schema-engine binary from `binaries.prisma.sh`)

## 2. Database
Using `psql` as a superuser (`postgres`):
```sql
CREATE USER store WITH PASSWORD 'store_pw' CREATEDB;
CREATE DATABASE store_rating      OWNER store;
CREATE DATABASE store_rating_test OWNER store;
```
Linux: `sudo -u postgres psql`. macOS (Homebrew): `psql postgres`. Windows: SQL Shell (psql) from the PostgreSQL install.
Use any credentials you like — just keep `.env` consistent.

## 3. Environment
```bash
cp .env.example .env      # Windows (cmd): copy .env.example .env
```
| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Dev database connection string |
| `TEST_DATABASE_URL` | **Disposable** DB for backend tests (wiped on each run; name must contain `test`) |
| `NODE_ENV` | `development` / `test` / `production` |
| `BACKEND_PORT` | API port (default 4000) |
| `FRONTEND_URL` | Exact browser origin (CORS allow-list + CSRF origin check) |
| `JWT_SECRET` | ≥ 32 random chars. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, default `8h` (cookie is 8h too) |
| `COOKIE_SECURE` | `true` when served over HTTPS (always on when `NODE_ENV=production`) |
| `BCRYPT_ROUNDS` | 4–14, default 10 |
| `VITE_API_URL` | API base used by the browser, default `/api/v1` |
| `VITE_PROXY_TARGET` | Where the Vite dev server proxies `/api`, default `http://localhost:4000` |

The backend validates these at startup and exits with a clear message if anything is missing/invalid.

## 4. Install, migrate, seed, run
```bash
npm install
npm run db:generate     # Prisma client
npm run db:deploy       # apply prisma/migrations
npm run db:seed         # demo data (idempotent)
npm run dev             # API :4000 + web :5173
```
`npm run db:setup` runs generate + deploy + seed in one go.
Changing `schema.prisma` later: `npm run db:migrate` (creates + applies a new migration).

### About the migrations
`prisma/migrations/` contains two migrations: `init` (tables, indexes, FKs) and `integrity_constraints` (hand-written SQL: rating CHECK range, owner-role and rater-role triggers, role-change guard). The Prisma client uses `engineType = "client"` with the `@prisma/adapter-pg` driver adapter (no native query-engine binary needed).

## 5. Tests
```bash
npm test                 # backend + frontend
npm run test:backend     # requires TEST_DATABASE_URL (rebuilds the test DB from the migration files)
npm run test:frontend
npm run lint && npm run typecheck && npm run build
npm run smoke            # while `npm run dev` is running and DB is seeded
```

## 6. Production notes
- `npm run build`, then `npm run start -w apps/backend` (needs generated Prisma client + `npm run db:deploy`).
- Serve `apps/frontend/dist` from any static host / reverse proxy and route `/api` to the backend **on the same origin** (keeps cookies first-party). Set `FRONTEND_URL` to that origin, `NODE_ENV=production`, `COOKIE_SECURE=true`, behind HTTPS.
- If behind a reverse proxy, configure Express `trust proxy` so rate-limiting sees real client IPs.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `Invalid or missing environment configuration` | `.env` missing/incomplete → copy `.env.example`; `JWT_SECRET` must be ≥ 32 chars |
| `Cannot connect to PostgreSQL` | Start the service; check host/port/user/password/db in `DATABASE_URL` |
| `@prisma/client did not initialize yet` | `npm run db:generate` |
| `P1001`/`P1000` during migrate | Wrong credentials or DB not reachable |
| Prisma download errors (`binaries.prisma.sh`) | Network/proxy blocks Prisma CDN; allow it or set `HTTPS_PROXY` |
| Tests: `Refusing to run destructive tests` | `TEST_DATABASE_URL` must point to a DB whose name contains `test` |
| Login works but next request is 401 | Browser blocked the cookie: use the Vite proxy (`/api/v1`) or keep `FRONTEND_URL` identical to the browser origin |
| `403 Missing CSRF protection header` | Custom clients must send `X-Requested-With: XMLHttpRequest` on POST/PATCH |
| Port already in use | Change `BACKEND_PORT` (and `VITE_PROXY_TARGET`) or free the port |
