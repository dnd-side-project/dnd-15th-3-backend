#!/usr/bin/env bash
set -euo pipefail

exec kubectl port-forward \
  -n dnd-15th-3-dev \
  statefulset/momo-statistics-postgres \
  15433:5432
