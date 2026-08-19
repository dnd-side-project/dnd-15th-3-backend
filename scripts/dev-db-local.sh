#!/usr/bin/env bash
set -euo pipefail

if ! docker info >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Docker is not running (or not installed).
Start Docker Desktop or OrbStack, then re-run 'mise run db:start'.
EOF
  exit 1
fi

docker compose up -d postgres

for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres -d momo >/dev/null 2>&1; then
    echo "Local PostgreSQL is ready at 127.0.0.1:15432 (user: postgres, db: momo)."
    echo "First time only: run 'pnpm migration:run' to create the schema."
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for local PostgreSQL to become ready." >&2
exit 1
