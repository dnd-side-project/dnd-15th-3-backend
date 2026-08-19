#!/usr/bin/env bash
set -euo pipefail
umask 077

# Infrastructure admin only: issues a restricted developer kubeconfig for the
# dev namespace. The generated kubeconfig can discover database workloads,
# read only the named DB auth secrets, and create pod port-forwards. It has no
# write access to application or database resources.
#
# Usage: bash scripts/make-db-kubeconfig.sh [output-file]

namespace=dnd-15th-3-dev
service_account=db-developer
output=${1:-kubeconfig.db-developer.yaml}

if ! kubectl get serviceaccount "$service_account" -n "$namespace" >/dev/null 2>&1; then
  cat >&2 <<EOF
ServiceAccount '$service_account' not found in '$namespace'.
It is defined in deploy/k8s/overlays/develop/db-access.yaml and appears
after that manifest reaches the develop branch and ArgoCD syncs it.
EOF
  exit 1
fi

server=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
ca_data=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')
if [ -z "$ca_data" ]; then
  echo "The current kubeconfig does not embed certificate-authority-data." >&2
  exit 1
fi
token=$(kubectl get secret "${service_account}-token" -n "$namespace" -o jsonpath='{.data.token}' | base64 -d)

cat > "$output" <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: dnd-15th-3-dev
    cluster:
      server: $server
      certificate-authority-data: $ca_data
contexts:
  - name: db-developer
    context:
      cluster: dnd-15th-3-dev
      user: db-developer
      namespace: $namespace
current-context: db-developer
users:
  - name: db-developer
    user:
      token: $token
EOF

cat <<EOF
Wrote $output — share it over a secure channel (never commit or paste in chat).

Developer setup:
  1. Save the file (for example ~/.kube/db-developer.yaml).
  2. Use it:  export KUBECONFIG=\$HOME/.kube/db-developer.yaml
     or merge: kubectl config view --flatten > ~/.kube/merged && mv ~/.kube/merged ~/.kube/config
  3. Verify:  mise run cluster-check
  4. Then 'mise run dev-api' or 'mise run db-forward-dev' works as usual.
EOF
