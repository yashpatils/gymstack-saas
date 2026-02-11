# Contributing

## Preflight checks
Before pushing, run:

```bash
npm run preflight
```

This runs the same strict checks used in CI for both apps.

## Deployment roots
- Vercel project root directory: `/frontend`
- Railway project root directory: `/backend`

## Lockfile rules
- Use `npm ci` for deterministic installs in both `/frontend` and `/backend`.
- Commit lockfile changes whenever dependencies change.
- Keep both `frontend/package-lock.json` and `backend/package-lock.json` in version control.
