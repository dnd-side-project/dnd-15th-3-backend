#!/usr/bin/env bash
set -euo pipefail

exec kubectl port-forward \
  -n dnd-15th-3-dev \
  statefulset/momo-postgres \
  15432:5432
