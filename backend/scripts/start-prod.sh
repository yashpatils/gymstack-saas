#!/usr/bin/env bash
set -euxo pipefail

resolve_failed_migrations() {
  local status_output
  local failed_migrations

  status_output="$(npx prisma migrate status 2>&1 || true)"
  echo "$status_output"

  failed_migrations="$(
    echo "$status_output" \
      | tr -d '\r' \
      | awk '
          /Following migration have failed:/ { capture=1; next }
          /Read more/ { capture=0 }
          capture {
            line=$0
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
            if (line ~ /^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_[A-Za-z0-9_]+$/) {
              print line
            }
          }
        '
  )"

  if [[ -z "$failed_migrations" ]]; then
    return 0
  fi

  echo "[start-prod] Found failed migrations. Marking them rolled back so deploy can continue."
  while IFS= read -r migration_name; do
    [[ -z "$migration_name" ]] && continue
    echo "[start-prod] Resolving failed migration as rolled back: $migration_name"
    npx prisma migrate resolve --rolled-back "$migration_name"
  done <<< "$failed_migrations"
}

echo "[start-prod] Running DB connectivity check"
node scripts/db-check.js

echo "[start-prod] Checking migration status (informational)"
resolve_failed_migrations

echo "[start-prod] Applying migrations"
npx prisma migrate deploy

echo "[start-prod] Starting server"
node dist/main.js
