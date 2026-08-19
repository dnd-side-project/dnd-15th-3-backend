#!/usr/bin/env bash
set -euo pipefail
umask 077

usage() {
  cat >&2 <<'EOF'
Usage: bash scripts/provision-db-reader.sh <dev|prod> <developer-id> [output-directory]

Creates or rotates a developer-specific PostgreSQL read-only login and issues a
short-lived kubeconfig that can only port-forward the Core PostgreSQL Pod.

The matching ServiceAccount must already exist in the target namespace.
EOF
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage
  exit 1
fi

environment=$1
developer_id=$2
requested_output=${3:-}
token_duration=${DB_READER_TOKEN_DURATION:-168h}

if [[ ! "$developer_id" =~ ^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$ ]]; then
  echo "developer-id must be 1-32 lowercase letters, digits, or hyphens." >&2
  exit 1
fi

case "$environment" in
  dev | develop)
    environment=dev
    namespace=dnd-15th-3-dev
    local_port=15442
    ;;
  prod | main)
    environment=prod
    namespace=dnd-15th-3-prod
    local_port=15443
    ;;
  *)
    usage
    exit 1
    ;;
esac

for dependency in kubectl openssl; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    echo "Missing required command: $dependency" >&2
    exit 1
  fi
done

service_account="db-reader-$developer_id"
db_role="momo_reader_${developer_id//-/_}"
pod=momo-postgres-0

if [ -n "$requested_output" ]; then
  output_dir=$requested_output
  if [ -e "$output_dir" ]; then
    echo "Refusing to overwrite existing output: $output_dir" >&2
    exit 1
  fi
  mkdir -m 700 -p "$output_dir"
else
  output_dir=$(mktemp -d "${TMPDIR:-/tmp}/db-reader-bundle.$environment.$developer_id.XXXXXX")
fi

cleanup_on_error() {
  status=$?
  if [ "$status" -ne 0 ]; then
    rm -rf "$output_dir"
  fi
  exit "$status"
}
trap cleanup_on_error EXIT

if ! kubectl get serviceaccount "$service_account" -n "$namespace" >/dev/null 2>&1; then
  cat >&2 <<EOF
ServiceAccount '$service_account' not found in '$namespace'.
Add it and its db-reader RoleBinding to the GitOps manifest before provisioning.
EOF
  exit 1
fi

kubectl wait --for=condition=Ready "pod/$pod" -n "$namespace" --timeout=30s >/dev/null

server=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
ca_data=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')
if [ -z "$server" ] || [ -z "$ca_data" ]; then
  echo "The current admin kubeconfig must contain a server and embedded CA data." >&2
  exit 1
fi

token=$(kubectl create token "$service_account" -n "$namespace" --duration="$token_duration")
db_name=$(kubectl exec -n "$namespace" "$pod" -- sh -c 'printf "%s" "$POSTGRES_DB"')
db_password=$(openssl rand -hex 24)

{
  printf "\\set reader_role %s\\n" "$db_role"
  printf "\\set reader_password %s\\n" "$db_password"
  cat <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'reader_role')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'reader_role'
)
\gexec

SELECT format(
  'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3',
  :'reader_role',
  :'reader_password'
)
\gexec

SELECT format('ALTER ROLE %I SET default_transaction_read_only TO on', :'reader_role')
\gexec
SELECT format('ALTER ROLE %I SET statement_timeout TO %L', :'reader_role', '60s')
\gexec
SELECT format(
  'ALTER ROLE %I SET idle_in_transaction_session_timeout TO %L',
  :'reader_role',
  '60s'
)
\gexec

SELECT format(
  'REVOKE ALL PRIVILEGES ON DATABASE %I FROM %I',
  current_database(),
  :'reader_role'
)
\gexec
SELECT format(
  'GRANT CONNECT ON DATABASE %I TO %I',
  current_database(),
  :'reader_role'
)
\gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('REVOKE ALL PRIVILEGES ON SCHEMA public FROM %I', :'reader_role')
\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'reader_role')
\gexec
SELECT format(
  'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
  :'reader_role'
)
\gexec
SELECT format(
  'GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I',
  :'reader_role'
)
\gexec
SELECT format(
  'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
  :'reader_role'
)
\gexec
SELECT format(
  'GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO %I',
  :'reader_role'
)
\gexec
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
  current_user,
  :'reader_role'
)
\gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
  current_user,
  :'reader_role'
)
\gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',
  current_user
)
\gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON TABLES TO %I',
  current_user,
  :'reader_role'
)
\gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON SEQUENCES TO %I',
  current_user,
  :'reader_role'
)
\gexec

SELECT 1 / CASE
  WHEN has_schema_privilege(:'reader_role', 'public', 'CREATE') THEN 0
  ELSE 1
END;
SELECT 1 / CASE
  WHEN EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (
        has_table_privilege(:'reader_role', format('%I.%I', schemaname, tablename), 'INSERT')
        OR has_table_privilege(:'reader_role', format('%I.%I', schemaname, tablename), 'UPDATE')
        OR has_table_privilege(:'reader_role', format('%I.%I', schemaname, tablename), 'DELETE')
        OR has_table_privilege(:'reader_role', format('%I.%I', schemaname, tablename), 'TRUNCATE')
      )
  ) THEN 0
  ELSE 1
END;
SQL
} | kubectl exec -i -n "$namespace" "$pod" -- sh -c '
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=ON_ERROR_STOP=1
' >/dev/null

reader_result=$(
  printf '%s\n' "$db_password" |
    kubectl exec -i -n "$namespace" "$pod" -- sh -c '
      IFS= read -r PGPASSWORD
      export PGPASSWORD
      psql --host 127.0.0.1 --username "$1" --dbname "$2" \
        --tuples-only --no-align --set=ON_ERROR_STOP=1 \
        --command "SELECT current_user, current_database(), current_setting('\''transaction_read_only'\'');"
    ' sh "$db_role" "$db_name"
)

if [ "$reader_result" != "$db_role|$db_name|on" ]; then
  echo "Read-only login verification failed." >&2
  exit 1
fi

if printf '%s\n' "$db_password" |
  kubectl exec -i -n "$namespace" "$pod" -- sh -c '
    IFS= read -r PGPASSWORD
    export PGPASSWORD
    psql --host 127.0.0.1 --username "$1" --dbname "$2" \
      --set=ON_ERROR_STOP=1 \
      --command "BEGIN; CREATE TABLE public.__momo_reader_write_probe(id integer); ROLLBACK;"
  ' sh "$db_role" "$db_name" >/dev/null 2>&1; then
  echo "Write-denial verification failed: the reader created a table." >&2
  exit 1
fi

kubeconfig="$output_dir/kubeconfig.$environment.$developer_id.yaml"
pgpass="$output_dir/$environment.$developer_id.pgpass"
instructions="$output_dir/README.txt"

cat >"$kubeconfig" <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: dnd-15th-3
    cluster:
      server: $server
      certificate-authority-data: $ca_data
contexts:
  - name: db-reader-$environment
    context:
      cluster: dnd-15th-3
      user: $service_account
      namespace: $namespace
current-context: db-reader-$environment
users:
  - name: $service_account
    user:
      token: $token
EOF

if ! KUBECONFIG="$kubeconfig" kubectl auth can-i \
  get "pod/$pod" --quiet; then
  echo "Generated kubeconfig cannot get the target PostgreSQL Pod." >&2
  exit 1
fi
if ! KUBECONFIG="$kubeconfig" kubectl auth can-i \
  create "pods/$pod" --subresource=portforward --quiet; then
  echo "Generated kubeconfig cannot port-forward the target PostgreSQL Pod." >&2
  exit 1
fi
if KUBECONFIG="$kubeconfig" kubectl auth can-i list pods --quiet; then
  echo "Generated kubeconfig unexpectedly allows Pod listing." >&2
  exit 1
fi
if KUBECONFIG="$kubeconfig" kubectl auth can-i get secrets --quiet; then
  echo "Generated kubeconfig unexpectedly allows Secret reads." >&2
  exit 1
fi
if KUBECONFIG="$kubeconfig" kubectl auth can-i \
  create pods --subresource=portforward --quiet; then
  echo "Generated kubeconfig unexpectedly allows arbitrary Pod port-forwarding." >&2
  exit 1
fi

printf '127.0.0.1:%s:%s:%s:%s\n' \
  "$local_port" "$db_name" "$db_role" "$db_password" >"$pgpass"

cat >"$instructions" <<EOF
Momo $environment Core PostgreSQL read-only access

Prerequisite:
  Tailscale must be connected and allowed to reach the cluster API.

Files:
  kubeconfig.$environment.$developer_id.yaml  Kubernetes token (default lifetime: $token_duration)
  $environment.$developer_id.pgpass           PostgreSQL password

Terminal 1:
  export KUBECONFIG=\$PWD/kubeconfig.$environment.$developer_id.yaml
  kubectl port-forward pod/momo-postgres-0 $local_port:5432

Terminal 2:
  PGPASSFILE=\$PWD/$environment.$developer_id.pgpass \
    psql -h 127.0.0.1 -p $local_port -U $db_role -d $db_name

The account can SELECT existing and future public-schema tables but cannot
create, update, or delete persistent database objects. Kubernetes access is
limited to getting and port-forwarding momo-postgres-0 in $namespace.
EOF

chmod 600 "$kubeconfig" "$pgpass" "$instructions"
archive="$output_dir.tar.gz"
tar -czf "$archive" -C "$(dirname "$output_dir")" "$(basename "$output_dir")"
chmod 600 "$archive"

trap - EXIT
printf 'Provisioned %s as %s.\nBundle: %s\nArchive: %s\n' \
  "$environment" "$db_role" "$output_dir" "$archive"
