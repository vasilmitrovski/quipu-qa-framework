#!/usr/bin/env bash
# Waits until a ParaBank instance serves its home page, then initialises its database.
set -euo pipefail

BASE_URL="${1:-http://localhost:8080/parabank}"
for i in $(seq 1 60); do
  if curl -fsS "$BASE_URL/index.htm" > /dev/null 2>&1; then
    echo "ParaBank is up at $BASE_URL (after ${i} attempts)"
    curl -fsS -X POST "$BASE_URL/services/bank/initializeDB" > /dev/null || true
    exit 0
  fi
  sleep 2
done

echo "ParaBank did not become ready at $BASE_URL" >&2
exit 1
