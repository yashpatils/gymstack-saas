#!/usr/bin/env bash
set -euxo pipefail

resolve_failed_migrations() {
  local failed_migrations
  local status_output
  local status_exit_code

  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "[start-prod] Unable to check for failed migrations: DATABASE_URL is not set." >&2
    exit 1
  fi

  echo "[start-prod] Checking failed migrations via Prisma status"
  set +e
  status_output=$(npx prisma migrate status 2>&1)
  status_exit_code=$?
  set -e

  if [[ "$status_output" == *"failed migrations"* ]]; then
    echo "[start-prod] ERROR: Failed Prisma migrations detected. Startup halted." >&2
    printf '%s\n' "$status_output" >&2
    return 1
  fi

  if [[ $status_exit_code -ne 0 ]]; then
    echo "[start-prod] WARNING: prisma migrate status failed; falling back to direct DB check when possible." >&2
    printf '%s\n' "$status_output" >&2
  else
    echo "[start-prod] No failed Prisma migrations detected via prisma migrate status"
    return 0
  fi

  if ! command -v psql >/dev/null 2>&1; then
    echo "[start-prod] psql not available and prisma migrate status failed — skipping additional failed migration check"
    return 0
  fi

  failed_migrations="$({
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at;"
  } 2>/dev/null || true)"

  if [[ -n "$failed_migrations" ]]; then
    echo "[start-prod] ERROR: Failed Prisma migrations detected. Startup halted."
    echo "[start-prod] Failed migration name(s):"
    while IFS= read -r migration_name; do
      [[ -z "$migration_name" ]] && continue
      echo "[start-prod]   - $migration_name"
    done <<< "$failed_migrations"
    echo "[start-prod] Resolve the failed migration(s) manually (for example with prisma migrate resolve), then redeploy."
    return 1
  fi

  echo "[start-prod] No failed Prisma migrations detected"
}

echo "[start-prod] Running DB connectivity check"
node scripts/db-check.js

echo "[start-prod] Checking migration status"
resolve_failed_migrations

echo "[start-prod] Applying migrations"
set +e
migrate_output=$(npx prisma migrate deploy 2>&1)
migrate_exit_code=$?
set -e

if [[ $migrate_exit_code -ne 0 ]]; then
  echo "$migrate_output" >&2
  echo "[start-prod] ERROR: prisma migrate deploy failed. Startup halted." >&2

  if [[ "$migrate_output" == *"P3009"* ]]; then
    failed_migration=$(printf '%s\n' "$migrate_output" | sed -n 's/.*The `\([^`]*\)` migration.*/\1/p' | head -n 1)

    if [[ -n "$failed_migration" ]]; then
      escaped_failed_migration=${failed_migration//\'/\'\'}
      echo "[start-prod] Detected failed migration: $failed_migration" >&2
      echo "[start-prod] Inspect Neon migration logs with this query:" >&2
      echo "[start-prod]   SELECT migration_name, started_at, finished_at, rolled_back_at, logs FROM _prisma_migrations WHERE migration_name = '$escaped_failed_migration';" >&2
      echo "[start-prod] Run the following commands:" >&2
      echo "[start-prod]   npx prisma migrate resolve --rolled-back $failed_migration" >&2
      echo "[start-prod]   npx prisma migrate resolve --applied $failed_migration" >&2
      echo "[start-prod]   npx prisma migrate deploy" >&2
    else
      echo "[start-prod] Detected Prisma error code P3009." >&2
      echo "[start-prod] Inspect Neon migration logs with this query:" >&2
      echo "[start-prod]   SELECT migration_name, started_at, finished_at, rolled_back_at, logs FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at;" >&2
      echo "[start-prod] Run the following commands:" >&2
      echo "[start-prod]   npx prisma migrate resolve --rolled-back <migration>" >&2
      echo "[start-prod]   npx prisma migrate resolve --applied <migration>" >&2
      echo "[start-prod]   npx prisma migrate deploy" >&2
    fi
  fi

  exit 1
fi

echo "[start-prod] Starting server"
node dist/main.js
