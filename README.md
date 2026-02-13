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

## Railway configuration (backend)

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGIN` (optional override)
- `API_PREFIX` (optional, defaults to `api`)

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
