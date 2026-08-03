# K3s PostgreSQL Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Validate each Kubernetes manifest with Kustomize before applying it to the cluster.

**Goal:** Run isolated Prod and Dev PostgreSQL instances inside K3s and back up each database daily to OCI Object Storage.

**Architecture:** Each environment gets one PostgreSQL 17 StatefulSet, one ClusterIP Service, one retained local-path PVC, one SealedSecret, and one daily backup CronJob. PostgreSQL resources are managed by separate Argo CD Applications so API pruning cannot delete the database.

**Tech Stack:** K3s, Kubernetes StatefulSet, Kustomize, Argo CD, Bitnami Sealed Secrets, PostgreSQL 17 Alpine, rclone, OCI S3-compatible Object Storage.

## Global Constraints

- Prod and Dev PostgreSQL instances are isolated by namespace.
- Existing Aiven data is not migrated; both databases start empty.
- PostgreSQL uses the existing K3s `local-path` StorageClass and one RWO PVC per environment.
- StatefulSet PVCs use Kubernetes PVC retention policy `Retain` when the StatefulSet is deleted or scaled.
- Daily custom-format `pg_dump` files are uploaded to OCI and deleted after 14 days.
- Database passwords are sealed with `deploy/sealed-secrets.pub.pem` and never committed as plaintext.
- API DB connections use the in-cluster Service `momo-postgres`, not an external hostname.
- The existing API OCI credentials and bucket names are referenced through the existing `momo-api-env` Secret.
- No production data is deleted during this rollout.

## Task 1: PostgreSQL resource base

- Create `deploy/k8s/postgres/base/service.yaml` for the `momo-postgres` ClusterIP Service on port 5432.
- Create `deploy/k8s/postgres/base/statefulset.yaml` for PostgreSQL 17 Alpine with a 1-replica StatefulSet, health probes using `pg_isready`, a 5Gi `local-path` volume claim, and PVC retention policy set to `Retain`.
- Create `deploy/k8s/postgres/base/backup-cronjob.yaml` with a daily `Asia/Seoul` schedule, a `postgres:17-alpine` dump init container, an `rclone/rclone` upload container, and 14-day retention.
- Create `deploy/k8s/postgres/base/kustomization.yaml`.

## Task 2: Environment overlays and sealed database credentials

- Create `deploy/k8s/postgres/overlays/main` and `deploy/k8s/postgres/overlays/develop`.
- Set Prod PVC size to 10Gi and backup prefix to `postgresql/prod`.
- Set Dev PVC size to 5Gi and backup prefix to `postgresql/dev`.
- Add one SealedSecret per environment with `POSTGRES_DB=momo`, `POSTGRES_USER=momo`, and a randomly generated `POSTGRES_PASSWORD`.
- Reference existing `momo-api-env` keys for OCI namespace, region, access key, secret key, and environment-specific bucket name.

## Task 3: Separate Argo CD Applications

- Create `deploy/argocd/application-postgres-main.yaml` targeting `deploy/k8s/postgres/overlays/main` and namespace `dnd-15th-3`.
- Create `deploy/argocd/application-postgres-develop.yaml` targeting `deploy/k8s/postgres/overlays/develop` and namespace `dnd-15th-3-dev`.
- Enable automated sync, prune, and self-heal for both applications.

## Task 4: Switch API database configuration

- Add explicit `DB_HOST=momo-postgres`, `DB_PORT=5432`, `DB_DATABASE=momo`, `DB_USERNAME=momo`, `DB_SSL=false`, and a Secret reference for `DB_PASSWORD` to each existing API environment overlay.
- Keep the old Aiven values in `momo-api-env` until the new DBs are healthy and the API is verified.
- Add local PostgreSQL connection values to `.env.example`.

## Task 5: Verification and operations documentation

- Render both PostgreSQL overlays with `kubectl kustomize`.
- Run API and PostgreSQL server-side dry runs with `kubectl apply --dry-run=server -k`.
- Deploy Dev first, wait for PostgreSQL and API rollout, run a manual backup Job, and verify the OCI object path.
- Deploy Prod only after Dev is healthy.
- Add `docs/postgresql-operations.md` covering rollout, backup, restore, PVC retention, and the local-path node-failure limitation.
