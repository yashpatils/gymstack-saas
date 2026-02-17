#!/usr/bin/env bash
set -euxo pipefail

migration_startup_guard() {
  local status_output
  local status_exit_code
  local failed_migrations

  set +e
  status_output="$(npx prisma migrate status 2>&1)"
  status_exit_code=$?
  set -e

  echo "$status_output"

  failed_migrations="$(
    echo "$status_output" \
      | tr -d '\r' \
      | awk '
          /Following migration(s)? have failed:/ { capture=1; next }
          /Read more/ { capture=0 }
          capture {
            line=$0
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
            gsub(/^[-*][[:space:]]+/, "", line)
            if (line ~ /^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_[A-Za-z0-9_]+$/) {
              print line
            }
          }
        '
  )"

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

  if [[ $status_exit_code -ne 0 ]]; then
    echo "[start-prod] ERROR: prisma migrate status failed (exit code: $status_exit_code). Startup halted before migrate deploy."
    echo "[start-prod] Inspect the migration status output above and resolve manually before retrying."
    return 1
  fi
}

echo "[start-prod] Running DB connectivity check"
node scripts/db-check.js

echo "[start-prod] Checking migration status"
migration_startup_guard

echo "[start-prod] Applying migrations"
npx prisma migrate deploy

echo "[start-prod] Starting server"
node dist/main.js
