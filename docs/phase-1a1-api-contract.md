# Phase 1A.1 API Contract (non-breaking scaffold)

This repository now contains contract scaffolding for the Phase 1A.1 rollout:

- Added frontend login union support (`SUCCESS | OTP_REQUIRED`) while preserving current login behavior for non-2SV users.
- Added frontend helper functions for login OTP verify/resend endpoints.
- Added backend route alias for slug availability at `GET /api/tenants/slug-availability`.
- Extended slug availability shape with `validFormat` while preserving existing fields.
- Added backend DTO type definitions for login OTP contracts.

This pass intentionally focuses on contract alignment and additive compatibility. Runtime OTP challenge persistence, verification, and rate-limited security workflows will be implemented in follow-up phases.
