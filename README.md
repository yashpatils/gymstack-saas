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

- `NEXT_PUBLIC_API_URL` — Public browser API origin (example: `https://your-api.up.railway.app`).
  - In local development only, frontend falls back to `http://localhost:3000` when this variable is missing.
- `API_URL` — **Server-only frontend env var** for SSR/server actions to call Railway backend (usually same origin as `NEXT_PUBLIC_API_URL`).
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
- `APP_URL` — Canonical frontend app URL used in verification/delete links (example: `https://gymstack.club`).
- `EMAIL_FROM` — Sender identity (example: `Gymstack <no-reply@gymstack.club>`).
- `EMAIL_PROVIDER` — Email provider selector (`RESEND`).
- `RESEND_API_KEY` — Resend API key used by backend transactional email sender. Required when `NODE_ENV=production`.
- `EMAIL_DISABLE` — Optional boolean (`true`/`false`) to disable provider delivery while keeping logs (default: `false`).
- `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES` — legacy verification-token TTL (email verification now uses a fixed 24-hour token window on user records).
- `DELETE_ACCOUNT_TOKEN_TTL_MINUTES` — account delete token TTL in minutes (default: `30`).
- `ACCESS_TOKEN_TTL_MINUTES` — access token TTL in minutes (default: `15`).
- `REFRESH_TOKEN_TTL_DAYS` — rotating refresh token TTL in days (default: `30`).
- `BASE_DOMAIN` — Same value as frontend `NEXT_PUBLIC_BASE_DOMAIN` for server-side URL generation.
- `PLATFORM_ADMIN_EMAILS` — Comma-separated owner allowlist for platform admin access (case-insensitive), used by `/api/auth/me` and `/api/admin/*`.
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
- Platform admin domain: `https://admin.gymstack.club` (rewritten internally to `/_admin/*` and reserved from tenant slug routing).
- Location fallback domain (no custom domain): `https://<locationSlug>.<NEXT_PUBLIC_BASE_DOMAIN>`
- Active custom domains override fallback domains for landing/login/join links.

For local development without wildcard DNS:

- `http://localhost:3000/_sites/<locationSlug>`

When you purchase a real domain later, update only:

- Frontend: `NEXT_PUBLIC_BASE_DOMAIN`, `NEXT_PUBLIC_APP_URL`
- Backend: `BASE_DOMAIN`

Also ensure Vercel has wildcard domain support configured for `*.your-domain.com` and the apex/root domain attached.



### Admin domain setup

- Add `admin.gymstack.club` as a production domain in the Vercel frontend project.
- Keep wildcard domain support enabled for tenant subdomains (`*.gymstack.club`).
- `admin` is a reserved subdomain and is never treated as a tenant slug.

## Email verification and account deletion flows

- Signup and resend-verification send a verification email (`/verify-email?token=...`) on the base app domain.
- Verification links are single-use; backend stores only a SHA-256 token hash and 24-hour expiry on the user record.
- Resend verification is anti-abuse limited (minimum 60s between sends, max 5 sends per rolling hour).
- Forgot-password sends reset links (`/reset-password?token=...`).
- Account deletion requires password confirmation, then email confirmation (`/confirm-delete-account?token=...`).
- `POST /api/auth/resend-verification` and `POST /api/auth/forgot-password` always return generic success responses to avoid email enumeration.
- Verified email status is exposed from `GET /api/auth/me` as `emailVerified` and `emailVerifiedAt`.
- Sensitive write actions (invites, billing mutations, org updates, gym mutations) require verified email.
- Deletion is blocked when the user is the sole `TENANT_OWNER` in any tenant.

### Resend setup (gymstack.club)

1. In Resend, add and verify the sending domain `gymstack.club`.
2. Add the required DNS records Resend provides (SPF + DKIM and any verification record).
3. Wait for verification to turn green in Resend dashboard.
4. Set backend sender to `EMAIL_FROM="Gymstack <no-reply@gymstack.club>"`.

### Email delivery behavior by environment

- **Production (`NODE_ENV=production`)**
  - Backend attempts provider delivery for transactional templates.
  - Startup fails fast if `EMAIL_PROVIDER=RESEND` and `RESEND_API_KEY` is missing.
  - Provider failures are logged as structured `email_send_failure` events and thrown.
- **Development / non-production**
  - Provider calls are skipped intentionally.
  - Backend logs a DEV email line with template + redacted recipient + subject.
  - For verify/reset/delete templates, the full action link is logged for local testing.
  - Missing `RESEND_API_KEY` logs a warning and keeps DEV fallback behavior.

## OAuth providers (Google + Apple)

Backend OAuth callbacks are intentionally routed to the root domain (`gymstack.club`) to avoid wildcard/custom-domain callback drift.

Required backend env vars:

- `APP_URL=https://gymstack.club`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://gymstack.club/api/auth/oauth/google/callback`
- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`
- `APPLE_REDIRECT_URI=https://gymstack.club/api/auth/oauth/apple/callback`
- `OAUTH_ALLOWED_RETURN_HOSTS=gymstack.club,*.gymstack.club`

### Safe auto-link rule

OAuth email auto-linking is only allowed when the provider email is verified **and** the existing GymStack account is already trusted:

- user has `email_verified_at` set **or**
- user already has another verified OAuth identity.

If an email/password account is not yet trusted, OAuth login returns `ACCOUNT_LINK_REQUIRES_PASSWORD_LOGIN`. The user must first log in with password and then link from Settings.
