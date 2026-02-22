# Multi-tenant + multi-location context checklist

## Backend guard checks

1. Login and call a tenant-scoped endpoint without `X-Active-Tenant-Id`.
   - Expect `400` with `{ code: "NO_ACTIVE_TENANT" }`.
2. Login and call a location-scoped endpoint without `X-Active-Location-Id`.
   - Expect `400` with `{ code: "NO_ACTIVE_LOCATION" }`.
3. Login as low-privilege role and call an endpoint protected by `@RequireRoles(TENANT_OWNER)`.
   - Expect `403` with `{ code: "FORBIDDEN" }`.
4. Confirm every error includes `requestId`.

## Frontend flow checks

1. Clear localStorage, login with user with memberships.
   - App should derive and persist an active organization/location context.
2. Navigate to `/select-org` and choose org.
   - Verify `X-Active-Tenant-Id` is sent in subsequent API calls.
3. Navigate to `/select-location` and choose location.
   - Verify `X-Active-Location-Id` is sent in subsequent API calls.
4. Verify manual redirect helper behavior:
   - unauthenticated + requiresAuth => `/login`
   - missing tenant + requiresTenant => `/select-org`
   - missing location + requiresLocation => `/select-location`
