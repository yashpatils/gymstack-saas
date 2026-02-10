#!/usr/bin/env bash
set -euxo pipefail

echo "[start-prod] Running DB connectivity check"
node scripts/db-check.js

echo "[start-prod] Checking migration status (informational)"
npx prisma migrate status || true

echo "[start-prod] Applying migrations"
npx prisma migrate deploy

echo "[start-prod] Starting server"
node dist/main.js
