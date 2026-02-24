# Codex Mega Prompt Hardening Additions

Use this checklist to extend an existing implementation/fix prompt so Codex catches common parity and production-hardening issues.

## High-value audits to include

1. **Route–Permission–UI mismatch audit**
   - Verify frontend role gating and backend authorization match for every route and action.
   - Ensure hidden navigation cannot be bypassed via direct URL access.
   - Ensure UI-visible actions do not fail due to stricter backend permission checks.
   - Ensure backend does not allow actions that UI intentionally hides for the same role.

2. **Feature flags + env toggle audit**
   - Build a matrix of `feature -> required flags/env vars/providers -> fallback behavior`.
   - Verify missing config yields explicit UI feedback, not silent failures or dead spinners.

3. **API contract drift audit (frontend ↔ backend)**
   - Compare frontend response typings to backend DTOs and Prisma-backed response contracts.
   - Fix naming drift (`camelCase`/`snake_case`), enum mismatches, nullability handling, and stale field assumptions.

4. **Optimistic mutation rollback correctness**
   - Require rollback or refetch on failure for all optimistic mutations.
   - Include invite resend/revoke, staff role changes, billing updates, notifications, and client status updates.

5. **Loading/empty/error state standardization**
   - Every data page must include loading, success, empty, and error-with-retry states.
   - Eliminate blank pages, infinite spinners, and console-only error handling.

6. **Form validation parity (client + server)**
   - Align frontend schema validation with backend DTO validation.
   - Ensure backend returns structured field-level errors that frontend forms can render.

7. **Timezone/date logic audit**
   - Standardize timezone assumptions across UI, API, and DB.
   - Validate scheduling and analytics for UTC/local conversion and off-by-one-day boundaries.

8. **Pagination/sorting/filtering correctness**
   - Ensure server-side pagination and sort semantics are reflected accurately in UI.
   - Prevent computing aggregate metrics from paginated subsets unless explicitly intended.
   - Ensure filter/sort changes reset pagination predictably and persist state correctly.

9. **Search debouncing + race-condition handling**
   - Cancel stale requests or use request sequencing to prevent stale response overrides.
   - Reduce flicker and duplicate list requests on fast query changes.

10. **Webhook/async idempotency**
    - Ensure retries cannot duplicate billing actions, notifications, or invites.
    - Validate signature verification for billing webhooks.

11. **Audit logging + observability**
    - Add structured logs for auth flows, admin actions, billing mutations, and destructive operations.
    - Use correlation/request IDs and separate user-facing errors from backend diagnostic detail.

12. **Seed/demo data realism**
    - Remove fabricated values that masquerade as real production data.
    - Label placeholders explicitly or replace with backend-derived values.

13. **Migration hygiene/schema drift**
    - Identify duplicate/partial migrations and dead models.
    - Build a schema-to-code usage map before deleting models/columns.

14. **Cross-role smoke tests**
    - Validate platform admin, tenant admin, staff, client, and logged-out flows.
    - For each role: login, landing page, nav visibility, one key action, and redirect-loop check.

15. **Accessibility quick pass**
    - Validate focus visibility (both themes), keyboard navigation, modal focus trap, icon labels, and contrast.

## Required artifacts to request from Codex

- Frontend route map (route + layout + auth requirement).
- Backend endpoint map (endpoint + guard + DTO).
- Navigation parity matrix.
- Feature flag/env dependency matrix.
- Prisma model usage matrix (model -> services/controllers/pages).
- Dead code suspects list (report first, delete only when safe).

## Copy/paste block for your mega prompt

```text
==================================================
EXTRA HARDENING & PARITY CHECKS (REQUIRED)
==================================================
In addition to all fixes above, perform these audits and patch issues found:

1) Route/Permission/UI parity
- Ensure frontend route gating, visible actions, and backend authorization match exactly.
- Direct URL access must not bypass hidden nav restrictions.

2) Feature flag + env dependency matrix
- For every major feature/page, identify required flags/env vars/providers.
- If missing, UI must show explicit disabled/unavailable state (not fail silently).

3) API contract drift audit
- Verify frontend typings and assumptions match backend DTOs and Prisma-backed responses.
- Fix nullable field handling, enum mismatches, naming drift, and stale field references.

4) Mutation reliability
- Any optimistic mutation must rollback or refetch on error.
- Add per-action loading states for destructive and stateful actions.

5) State coverage on data pages
- Every data-driven page must implement loading, success, empty, and error states with retry.

6) Form validation parity
- Align frontend validation schemas with backend DTO validation rules and error messages.

7) Timezone/date consistency
- Audit scheduling/analytics date handling and standardize timezone assumptions (UI, API, DB).

8) Pagination/filter/sort correctness
- Ensure metrics and lists are not computed from paginated subsets unless explicitly intended.
- Verify filter/sort/pagination state is consistent across FE and BE.

9) Async/webhook idempotency
- Billing/webhook/invite/notification async handlers must be idempotent and safe to retry.

10) Observability & audit logs
- Add/verify structured logs for auth, admin actions, billing changes, and destructive operations.

11) Accessibility quick pass
- Focus visibility, keyboard navigation, labels, contrast, modal behavior on core pages.

12) Deliver additional matrices
- Route map
- Backend endpoint/guard map
- Feature flag/env dependency matrix
- Prisma model usage matrix
- Dead code suspects list (report only, delete only if clearly safe)
```

## Optional follow-up prompt

After functional parity/hardening passes, run a dedicated prompt for:
- theme consistency,
- spacing and typography scale,
- border/shadow consistency,
- mobile viewport/table overflow behavior,
- nav/menu contrast and interaction polish.
