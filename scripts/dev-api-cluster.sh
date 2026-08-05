#!/usr/bin/env bash
set -euo pipefail

namespace=dnd-15th-3-dev
secret_name=momo-postgres-auth

secret_value() {
  kubectl get secret "$secret_name" \
    -n "$namespace" \
    -o "jsonpath={.data.$1}" | base64 -d
}

export DB_HOST=127.0.0.1
export DB_PORT=15432
export DB_USERNAME="$(secret_value POSTGRES_USER)"
export DB_PASSWORD="$(secret_value POSTGRES_PASSWORD)"
export DB_DATABASE="$(secret_value POSTGRES_DB)"
export DB_SSL=false
export DB_SYNCHRONIZE=false

bash scripts/dev-db-forward.sh &
port_forward_pid=$!

cleanup() {
  kill "$port_forward_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM
sleep 1
kill -0 "$port_forward_pid" 2>/dev/null
pnpm start:dev
