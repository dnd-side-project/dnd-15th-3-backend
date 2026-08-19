#!/usr/bin/env bash
set -euo pipefail

if ! docker info >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Docker is not running (or not installed).
Start Docker Desktop or OrbStack, then re-run 'mise run dev'.
EOF
  exit 1
fi

if [ ! -f .env.development ]; then
  cp .env.example .env.development
  echo "Created .env.development from .env.example."
fi

set -a
# shellcheck source=/dev/null
source .env.development
set +a

bash scripts/dev-db-local.sh

export DB_HOST=127.0.0.1
export DB_PORT=15432
export DB_USERNAME=postgres
export DB_PASSWORD=momo
export DB_DATABASE=momo
export DB_SSL=false
export DB_SYNCHRONIZE=false

pnpm migration:run

echo "Starting API at http://localhost:3000 (Swagger UI: /api/v1/docs)"
pnpm start:dev
