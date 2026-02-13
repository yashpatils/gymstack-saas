#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$repo_root/backend"
npm ci
npm run build

cd "$repo_root/frontend"
npm ci
npm run build
