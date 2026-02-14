# GymStack SaaS

GymStack is a multi-tenant gym operations platform with a **Next.js App Router frontend** and a **NestJS backend**.

## Project structure

- `frontend/` — Next.js + TypeScript (deployed to Vercel).
- `backend/` — NestJS API (deployed to Railway).

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run start:dev
```

## Build and deployment checks

From `frontend/`:

```bash
npm run lint
npm run typecheck
npm run build
npm run predeploy
```

`predeploy` runs lint + typecheck + build to gate production deploys.

## Vercel configuration (frontend)

Set the Vercel **Build Command** to:

```bash
npm run predeploy
```

Required environment variables:

- `NEXT_PUBLIC_API_URL` — **Required in Vercel production/preview**. Use the full Railway backend origin (example: `https://your-api.up.railway.app`).
  - In local development only, frontend falls back to `http://localhost:3000` when this variable is missing.
- `NEXT_PUBLIC_STRIPE_PRICE_ID` — Stripe price for upgrades (optional if billing checkout is disabled).

- `NEXT_PUBLIC_BASE_DOMAIN` — Platform base domain used for subdomain routing (example: `gymstack.club`).
- `NEXT_PUBLIC_APP_URL` — Canonical root app URL used as fallback for invite links (example: `https://gymstack.club`).

## Railway configuration (backend)

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS` — comma-separated exact origins for CORS allowlisting. Defaults include:
  - `https://gymstack.club`
  - `https://www.gymstack.club`
  - `https://gymstack-saas.vercel.app`
  - `http://localhost:3000`
- `ALLOWED_ORIGIN_REGEXES` — comma-separated regex patterns for dynamic origins/subdomains. Defaults include wildcard-safe patterns for:
  - `https://*.gymstack.club`
  - `https://*.vercel.app`
  - `http://*.localhost:3000`
- `FRONTEND_URL` (legacy optional support, comma-separated exact origins)
- `API_PREFIX` (optional, defaults to `api`)
- `BASE_DOMAIN` — Same value as frontend `NEXT_PUBLIC_BASE_DOMAIN` for server-side URL generation.
- `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` (optional, only needed if you automate domain attachment through Vercel API).

## Notes

- Playwright tests are dev-only and excluded from production type checks.
- Frontend routes:
  - `/platform`
  - `/platform/billing`
  - `/platform/team`
  - `/platform/settings`
  - `/reset-password`


## Vercel project settings

- **Root Directory:** `frontend`
- **Build Command:** `npm run predeploy`
- **Install Command:** `npm install`

## RBAC and tenant/location context

GymStack uses membership-driven RBAC for multi-tenant access:

- `TENANT_OWNER` (tenant-wide, `gymId/locationId = NULL`): full control across billing, settings, and all locations.
- `TENANT_LOCATION_ADMIN` (location-scoped): branch manager/admin permissions for a specific location.
- `GYM_STAFF_COACH` (location-scoped): coach/staff permissions for assigned workflows.
- `CLIENT` (location-scoped): self-service only.

Auth flow:

1. User logs in with email/password.
2. Backend returns user + memberships + suggested `activeContext` from `/api/auth/me`.
3. Frontend calls `POST /api/auth/set-context` when the user switches tenant/location context.
4. Permissions are resolved from active context and enforced via backend guards.

Onboarding flow:

- New users without memberships can create their first tenant + first location.
- The backend creates `organization (tenant)`, `gym (location)`, and `TENANT_OWNER` membership, then the app auto-uses that context.

### Seed data

Use the backend seed to create a tenant owner and tenant/gym context:

```bash
npm --prefix backend run db:seed
```

Environment overrides:

- `DEMO_EMAIL`
- `DEMO_PASSWORD`
- `DEMO_TENANT_NAME`
- `DEMO_GYM_NAME`


## Multi-domain routing

Routing is fully environment-driven (no code edits required when changing domains):

- Root marketing/owner login domain: `https://gymstack.club`
- Location fallback domain (no custom domain): `https://<locationSlug>.<NEXT_PUBLIC_BASE_DOMAIN>`
- Active custom domains override fallback domains for landing/login/join links.

For local development without wildcard DNS:

- `http://localhost:3000/_sites/<locationSlug>`

When you purchase a real domain later, update only:

- Frontend: `NEXT_PUBLIC_BASE_DOMAIN`, `NEXT_PUBLIC_APP_URL`
- Backend: `BASE_DOMAIN`

Also ensure Vercel has wildcard domain support configured for `*.your-domain.com` and the apex/root domain attached.
