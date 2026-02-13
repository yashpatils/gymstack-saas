#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000/api}"
EMAIL="signup-test-$(date +%s)@example.com"
PASSWORD="Passw0rd!"

curl --fail --show-error --silent \
  -X POST "${BASE_URL}/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" | jq .
