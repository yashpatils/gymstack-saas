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
- `NEXT_PUBLIC_MONITORING_ENDPOINT` — Optional client-side error/breadcrumb webhook endpoint for launch monitoring. If omitted, monitoring calls are skipped safely.

## Railway configuration (backend)

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS` — comma-separated exact origins for CORS allowlisting. Defaults include:
  - `https://gymstack.club`
  - `https://www.gymstack.club`
  - `https://admin.gymstack.club`
  - `https://gymstack-saas.vercel.app`
  - `http://localhost:3000`
- `ALLOWED_ORIGIN_REGEXES` — comma-separated regex patterns for dynamic origins/subdomains. Defaults include wildcard-safe patterns for:
  - `https://*.gymstack.club`
  - `https://*.vercel.app`
  - `http://localhost:*`
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
- `DEFAULT_TENANT_MRR_CENTS` — Optional admin dashboard fallback value (in cents) to estimate tenant MRR when Stripe item amounts are not available (default: `9900`).
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` — Stripe billing keys used by subscription sync and admin revenue reporting.
- `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` (optional, only needed if you automate domain attachment through Vercel API).
- `MONITORING_WEBHOOK_URL` — Optional backend error webhook endpoint (captures unhandled 5xx metadata + request IDs). If omitted, monitoring is disabled with no startup impact.

### Production migration troubleshooting

- `backend/scripts/start-prod.sh` now runs `npx prisma migrate status` before `migrate deploy`.
- If Prisma reports failed migrations (for example, `Following migration(s) have failed:`), startup is stopped and the script prints the exact failed migration name(s).
- The script does **not** auto-resolve production migrations. Resolve manually (for example with `prisma migrate resolve --applied/--rolled-back` after investigation), then redeploy.


### CORS allowlist defaults

The backend uses strict allowlisting with credentials enabled (no `*` wildcard):

- `https://gymstack.club`
- `https://www.gymstack.club`
- `https://admin.gymstack.club`
- `https://*.gymstack.club` (regex)
- `https://*.vercel.app` (preview regex)
- `http://localhost:*` (development regex)

Additional origins/patterns can be appended via `ALLOWED_ORIGINS` and `ALLOWED_ORIGIN_REGEXES`.

## Notes

- Sensitive auth endpoints enforce `X-Requested-With: XMLHttpRequest` and layered rate limits (IP + hashed email where applicable).
- `GET /api/public/location-by-host` ships CDN-friendly cache headers (`s-maxage=60, stale-while-revalidate=300`), while authenticated API traffic is forced to `Cache-Control: no-store`.
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
- Public host resolver endpoint: `GET /api/public/location-by-host` (reads `Host` header, strips port, returns safe `{ location, tenant }` branding context for custom domains or `<slug>.<BASE_DOMAIN>`).

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

## Launch readiness additions

### Marketing and routing

- Root domain `gymstack.club` serves marketing pages (`/`, `/features`, `/pricing`, `/contact`, `/terms`, `/privacy`, `/cookies`, `/status`).
- `/platform` remains the authenticated product app.
- `/admin` remains the admin app.
- Subdomains/custom domains continue to resolve to microsites via middleware rewrites (`/_sites/[slug]` and `/_custom/[host]`).

### SEO and social

- Added per-page metadata and canonical URLs for launch pages.
- Added `frontend/app/sitemap.ts` and `frontend/app/robots.ts`.
- Added default OpenGraph social image at `frontend/public/og-default.svg`.

### Email templates + queue

Backend transactional templates now include:
- `verify_email`
- `reset_password`
- `welcome_tenant_owner`
- `invite_staff`
- `invite_client`
- `booking_confirmation`
- `booking_reminder`

Email dispatch supports async queueing via `EmailQueueService` so request handlers can enqueue non-blocking sends.

### Support + health

- Health endpoints (`/health`, `/api/health`) now return uptime, app version, timestamp, and database connectivity.
- Support endpoint added: `POST /api/support/ticket`.
- `SupportTicket` Prisma model introduced for ticket persistence.

### Railway deployment steps

1. Push backend changes and run migrations (`npm run prisma:migrate deploy` or equivalent deploy migration command).
2. Set required Railway env vars from this README.
3. Deploy backend service and verify `/health` and `/api/health` respond successfully.
4. Validate `POST /api/support/ticket` creates records and queues support email notifications.

### Database migration strategy

- Create schema changes locally with Prisma migration files committed to git.
- Apply migrations in staging first.
- Apply the same migration set in production during low-traffic windows.
- Never rely on `prisma db push` in production.

### Domain + DNS checklist

- Apex/root: `gymstack.club` -> Vercel frontend.
- Admin: `admin.gymstack.club` -> Vercel frontend.
- Wildcard: `*.gymstack.club` -> Vercel frontend for microsites.
- API domain (optional): point to Railway backend if using custom API domain.
- Custom domain verification: confirm DNS TXT/CNAME values from GymStack domain verification flow before enabling traffic.

## Runbooks

### Reset admin access

1. Confirm the target email is listed in `PLATFORM_ADMIN_EMAILS`.
2. Confirm account exists and can log in successfully.
3. Re-authenticate and verify `/api/auth/me` returns `platformRole: PLATFORM_ADMIN`.

### CORS issue checklist

1. Confirm exact origin is present in `ALLOWED_ORIGINS` or matches `ALLOWED_ORIGIN_REGEXES`.
2. Confirm browser request sends credentials settings expected by frontend.
3. Check backend logs for blocked origin warnings.
4. Verify preflight (`OPTIONS`) response headers include expected allow headers.

### Email deliverability checklist

1. Verify `EMAIL_FROM` domain is authenticated in Resend.
2. Verify SPF, DKIM, and any required DMARC records.
3. Ensure `RESEND_API_KEY` is set in production.
4. Check backend logs for `email_send_failure` events.
5. Validate template links point to `APP_URL`/base domain.

### Stripe webhook troubleshooting

1. Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint in Stripe dashboard.
2. Inspect Railway logs for webhook signature failures.
3. Replay failed webhook events from Stripe dashboard.
4. Confirm subscription status sync updates expected tenant records.

### Domain verification troubleshooting

1. Re-check hostname and TXT/CNAME values for typos.
2. Confirm DNS propagation completed (can take minutes to hours).
3. Retry verification endpoint after propagation.
4. Ensure wildcard records do not conflict with explicit verification records.
