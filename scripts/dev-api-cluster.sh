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
forward_timeout=30

cleanup() {
  kill "$port_forward_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

for attempt in $(seq 1 "$forward_timeout"); do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    break
  fi

  if ! kill -0 "$port_forward_pid" 2>/dev/null; then
    echo "PostgreSQL port-forward stopped before $DB_HOST:$DB_PORT became ready." >&2
    exit 1
  fi

  if [ "$attempt" -eq "$forward_timeout" ]; then
    echo "Timed out waiting for PostgreSQL port-forward at $DB_HOST:$DB_PORT." >&2
    exit 1
  fi

  sleep 1
done

pnpm start:dev
