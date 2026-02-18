# Full QA runbook

## Environment

Backend `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/gymstack
JWT_SECRET=dev-secret
QA_MODE=true
ENABLE_QA_USER_SEED=true
```

Frontend `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api
```

## Deterministic setup

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend run migrate:deploy
npm --prefix backend run db:seed
```

## Start services (production mode)

```bash
npm --prefix backend run build
npm --prefix backend run start:prod

npm --prefix frontend run build
npm --prefix frontend run start
```

## Automated QA crawl

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
PLAYWRIGHT_WEB_SERVER_COMMAND="npm run build && npm run start" \
PLAYWRIGHT_WEB_SERVER_URL=http://127.0.0.1:3000 \
QA_EMAIL=qa+admin@gymstack.club \
QA_PASSWORD='TestPassword123!' \
npm run qa:full
```

Artifacts are written to:

- `frontend/tests/artifacts/qa/qa-report.md`
- `frontend/tests/artifacts/qa/qa-report.json`
- `frontend/tests/artifacts/qa/desktop/*.png`
- `frontend/tests/artifacts/qa/mobile/*.png`
