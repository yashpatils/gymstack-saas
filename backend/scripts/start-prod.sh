#!/usr/bin/env bash
set -euxo pipefail

resolve_failed_migrations() {
  local failed_migrations

  if ! command -v psql >/dev/null 2>&1; then
    echo "[start-prod] Unable to check for failed migrations: psql is not installed." >&2
    exit 1
  fi

  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "[start-prod] Unable to check for failed migrations: DATABASE_URL is not set." >&2
    exit 1
  fi

  failed_migrations="$({
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at;"
  } 2>/dev/null || true)"

  if [[ -z "$failed_migrations" ]]; then
    return 0
  fi

  echo "[start-prod] Found failed Prisma migrations:" >&2
  while IFS= read -r migration_name; do
    [[ -z "$migration_name" ]] && continue
    echo "  - $migration_name" >&2
  done <<< "$failed_migrations"

  echo "[start-prod] Migrations are in a failed state. Resolve each migration before deployment." >&2
  echo "Run: npx prisma migrate resolve --rolled-back <migration> OR --applied <migration>" >&2
  exit 1
}

echo "[start-prod] Running DB connectivity check"
node scripts/db-check.js

echo "[start-prod] Checking migration status (informational)"
resolve_failed_migrations

echo "[start-prod] Applying migrations"
npx prisma migrate deploy

echo "[start-prod] Starting server"
node dist/main.js
