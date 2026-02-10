#!/usr/bin/env bash
set -euxo pipefail

node scripts/db-check.js
npx prisma migrate status
npx prisma migrate deploy
node dist/main.js
