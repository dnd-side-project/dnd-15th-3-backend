#!/usr/bin/env bash
set -euo pipefail

namespace=dnd-15th-3-dev
secret_name=momo-postgres-auth

if ! command -v kubectl >/dev/null 2>&1; then
  cat >&2 <<'EOF'
kubectl not found.
Run 'mise install' to install the tools managed by mise.toml.
EOF
  exit 1
fi

if ! context=$(kubectl config current-context 2>/dev/null); then
  cat >&2 <<'EOF'
No kubeconfig found.

1. Ask the infrastructure admin for the dev cluster kubeconfig.
2. Save it as ~/.kube/config (or point KUBECONFIG at the file).
3. Join the team Tailscale network; the API server is reachable only through it.
4. Re-run 'mise run cluster-check'.
EOF
  exit 1
fi

server=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || echo unknown)
echo "context: $context"
echo "server:  $server"

if ! kubectl get secret "$secret_name" -n "$namespace" -o name >/dev/null 2>&1; then
  cat >&2 <<EOF
Context '$context' cannot read secret '$secret_name' in namespace '$namespace'.
Check the kubeconfig and permissions with the infrastructure admin,
and make sure the team Tailscale network is connected.
EOF
  exit 1
fi

if ! kubectl auth can-i create pods/portforward -n "$namespace" >/dev/null 2>&1; then
  cat >&2 <<EOF
Secret read succeeded, but port-forward is not allowed in namespace '$namespace'.
Ask the infrastructure admin for the pods/portforward permission.
EOF
  exit 1
fi

echo "Cluster access OK. Run 'mise run dev-api' to start the API against the dev cluster database."
