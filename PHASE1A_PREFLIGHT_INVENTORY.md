# Phase 1A Preflight Inventory

This inventory maps the current codebase to the Phase 1A implementation plan, with additive/non-breaking-first patch targets.

## Auth / Login
- Backend controller: `backend/src/auth/auth.controller.ts`
- Backend service: `backend/src/auth/auth.service.ts`
- Login DTOs: `backend/src/auth/dto/login.dto.ts`, `backend/src/auth/dto/me.dto.ts`
- Frontend login page: `frontend/app/login/page.tsx`
- Frontend auth client: `frontend/src/lib/auth.ts`
- Frontend auth provider: `frontend/src/providers/AuthProvider.tsx`

## Email infrastructure
- Email module/service: `backend/src/email/email.module.ts`, `backend/src/email/email.service.ts`
- Existing email tests: `backend/src/email/email.service.spec.ts`

## Tenant / slug / public site routing
- Tenant API/service: `backend/src/tenant/tenant.controller.ts`, `backend/src/tenant/tenant.service.ts`
- Slug utils (already present): `backend/src/common/slug.util.ts`, `frontend/src/lib/slug.ts`
- Public site API/service: `backend/src/public/public.controller.ts`, `backend/src/public/public.service.ts`
- Frontend host/subdomain routing: `frontend/middleware.ts`

## Settings / security / audit
- Settings API/service: `backend/src/settings/settings.controller.ts`, `backend/src/settings/settings.service.ts`
- Frontend settings client: `frontend/src/lib/settings.ts`
- Audit module/service: `backend/src/audit/audit.module.ts`, `backend/src/audit/audit.service.ts`, `backend/src/audit/audit.controller.ts`

## Onboarding
- Onboarding controller/service: `backend/src/onboarding/onboarding.controller.ts`, `backend/src/onboarding/onboarding.service.ts`

## Feature flags
- Effective feature flags API/service: `backend/src/feature-flags/feature-flags.controller.ts`, `backend/src/feature-flags/feature-flags.service.ts`
- Frontend feature flag helpers: `frontend/src/lib/featureFlags.ts`

## Data model / migrations
- Prisma schema: `backend/prisma/schema.prisma`
- Migrations directory: `backend/prisma/migrations/`

## Phase 1A patch anchors
1. Additive feature flags + frontend auth contract updates in:
   - `frontend/src/lib/featureFlags.ts`
   - `frontend/src/lib/auth.ts`
2. OTP persistence + secure update workflow in:
   - `backend/prisma/schema.prisma`
   - `backend/src/auth/*`
   - `backend/src/email/email.service.ts`
   - `backend/src/tenant/*`
3. Slug safety checks and availability endpoint in:
   - `backend/src/common/slug.util.ts`
   - `backend/src/tenant/*`
   - `frontend/src/lib/slug.ts`
   - `frontend/middleware.ts` (behavior-preserving)
4. Optional frontend flows behind flags in:
   - `frontend/app/login/page.tsx`
   - `frontend/src/providers/AuthProvider.tsx`
   - `frontend/app/settings/**`

## Baseline checks executed
- `npm run typecheck` (fails in current environment due missing frontend deps/types and unresolved modules)
- `npm run build:backend` (passes)
