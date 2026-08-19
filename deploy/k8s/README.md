# Kubernetes runtime configuration

The API and place-sync worker load their general application configuration from
`momo-api-env` and public media configuration from `momo-media-storage`.
Create `momo-media-storage` in each application namespace with these keys:

- `MEDIA_BUCKET_NAME` (`momo-media-dev` or `momo-media-prod`)
- `MEDIA_PUBLIC_BASE_URL` (the OCI native object URL through the trailing `/o/`)
- `OCI_REGION`
- `OCI_NAMESPACE`
- `OCI_S3_ACCESS_KEY`
- `OCI_S3_SECRET_KEY`

The media credentials should be limited to the environment's media bucket. They
need bucket inspection plus object create, read, and compensation-delete access,
but no object listing or access to other buckets. The buckets are public for
object reads without list access; the old `momo-bucket-*` buckets remain private
and are used only for PostgreSQL backups.

The PostgreSQL backup CronJob loads its Object Storage configuration from a
separate `momo-postgres-backup-storage` Secret in each database namespace. It
requires `OCI_REGION`, `OCI_NAMESPACE`, `OCI_S3_ACCESS_KEY`,
`OCI_S3_SECRET_KEY`, and `OCI_BUCKET_NAME`.

## Statistics PostgreSQL

Statistics and recommendation data use a separate PostgreSQL instance deployed
from `deploy/k8s/statistics-postgres`. It has its own StatefulSet, Service, PVC,
and `momo-statistics-postgres-auth` Secret, so aggregate queries and failures do
not share the Core PostgreSQL process or volume. The in-cluster endpoint is
`momo-statistics-postgres:5432`; consumers should read the database, user, and
password from that dedicated Secret.

The Core PostgreSQL database remains the source of truth. Do not connect the
Core TypeORM migration Job or API readiness probe to the statistics database,
and do not synchronously dual-write both databases. A statistics consumer must
use a replayable outbox/event or incremental batch flow with its own schema and
migrations so the derived data can be rebuilt from Core data.

The statistics database does not have an automated backup Job. Its PVC is
retained when the StatefulSet is deleted or scaled down, but node or disk loss
must be recovered by replaying Core data. Do not make a recommendation feature
depend on this database until its consumer has a tested full rebuild/backfill
path. A dedicated backup can be added later as a recovery-time optimization;
it must not become the only recovery path for derived data.

The separate StatefulSet isolates the database process, credentials, PVC, and
deployment lifecycle. Pod anti-affinity with the maximum weight prefers a node
that is not running Core `momo-postgres`, without allowing the derived database
to block Core recovery. This preference is not a hard node or disk isolation
guarantee. Use dedicated node labels and taints, a separate cluster, or managed
PostgreSQL if the remaining failure domain must be strictly isolated.

Kubernetes readiness continues to call `/health`, which covers the database and
PostGIS dependencies. OCI media diagnostics are available separately at
`/health/storage` and must not be configured as a readiness or liveness probe.
