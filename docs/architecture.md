# Architecture

## Overview
npm-workspaces monorepo: `apps/backend` (Express + Prisma), `apps/frontend` (React + Vite). Validation schemas are intentionally duplicated per app (Zod on both sides, same rules) instead of a shared package, to avoid a build step between workspaces; the backend remains authoritative.

```
Browser ──/api/v1──► Vite proxy (dev) / reverse proxy (prod) ──► Express
   Express: helmet → cors(FRONTEND_URL, credentials) → json(100kb) → cookies → request log
            → rate limit → CSRF check → router → authenticate → authorize(role) → validate(Zod)
            → controller → service → Prisma / parameterised SQL → PostgreSQL
            → centralised errorHandler ({success:false,message,errors[]})
```

## Backend modules
`auth` (register/login/logout/me/password) · `users` (admin user CRUD-lite) · `stores` (admin store management + normal-user directory, one aggregated SQL repository) · `ratings` (create/update) · `admin` (dashboard) · `owner` (own-store dashboard). Each module has schemas / service / controller-or-routes. Cross-cutting: `middleware/` (auth, csrf, validate, rateLimit, requestLogger, errorHandler), `errors/`, `validation/common.ts`, `utils/`.

## Security design
- **Authentication:** bcryptjs hashes; JWT (HS256, issuer-checked, 8h) in `srp_token` cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production. Nothing in localStorage; the SPA learns the role from `GET /auth/me`.
- **Authorization:** `authenticate` re-loads the user from the DB on every request (role claim in the token is ignored); `authorize(...roles)` guards each router. Owners never send a store id — the store is looked up by `Store.ownerId = session user`.
- **CSRF:** state-changing requests need `X-Requested-With: XMLHttpRequest` and (if present) `Origin === FRONTEND_URL`, on top of SameSite and strict CORS.
- **Injection:** Prisma query API or tagged `Prisma.sql` templates with bound parameters; sort columns come from whitelists; `%`/`_` in user search text are escaped.
- **Abuse:** rate limits (auth endpoints 30/15 min, API 1000/15 min), body size cap, generic login failure message with constant-time-ish comparison.
- **Errors:** no stack traces or SQL details to clients; unique violations → 409; DB down → 503.

## Frontend structure
`app/` (providers: QueryClient, Auth, Toaster · router with `ProtectedRoute` role guards · layouts) · `features/<area>` pages and dialogs · `components/{ui,common,tables,feedback}` reusable kit (Button, Input, Dialog, DataTable on TanStack Table with server-side sort/pagination, SearchInput with debounce, StatCard, states) · `services/` API calls · `lib/api.ts` (single fetch client: credentials, CSRF header, 15 s timeout, typed `ApiError`, global 401 handling) · `hooks/useTableState` (any filter/sort/limit change resets to page 1).
Stale responses are handled by TanStack Query keys + abort signals; `keepPreviousData` avoids flicker. Failed requests show an error state — never fallback data.
Role pages are code-split (`React.lazy`).
