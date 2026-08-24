# Kubernetes runtime configuration

The API and place-sync worker load their general application configuration from
`momo-api-env` and public media configuration from `momo-media-storage`.
`momo-api-env` must include `GOOGLE_PLACES_API_KEY` to enable verified Google
place photos and Google place synchronization. Restrict this server-side key to
the Places API and the deployment's outbound addresses. When the key is absent
or Google is unavailable, place endpoints remain available and return empty
photo fields instead of falling back to unverified web-image search.

Create `momo-media-storage` in each application namespace with these keys:

- `MEDIA_BUCKET_NAME` (`momo-media-dev` or `momo-media-prod`)
- `MEDIA_PUBLIC_BASE_URL` (the OCI native object URL through the trailing `/o/`)
- `OCI_REGION`
- `OCI_NAMESPACE`
- `OCI_S3_ACCESS_KEY`
- `OCI_S3_SECRET_KEY`

The media credentials are limited to the environment's media bucket with OCI
IAM policies granting `read buckets` and `manage objects`. `manage objects` is
the practical minimum because the application uses object listing as well as
create, read, and compensation-delete operations. OCI's cumulative object verbs
therefore make listing available to the authenticated application. The buckets
use `ObjectReadWithoutList`, so anonymous clients can read known object URLs but
cannot list objects. The old `momo-bucket-*` buckets remain private and are used
only for PostgreSQL backups.

The PostgreSQL backup CronJob loads its Object Storage configuration from a
separate `momo-postgres-backup-storage` Secret in each database namespace. It
requires `OCI_REGION`, `OCI_NAMESPACE`, `OCI_S3_ACCESS_KEY`,
`OCI_S3_SECRET_KEY`, and `OCI_BUCKET_NAME`. Each PostgreSQL overlay includes a
strict-scoped SealedSecret for this credential, independent of the application
Secret.

The shared application base also includes `momo-api-migration` as an Argo CD
`PreSync` Hook. Both dev and prod therefore run pending TypeORM migrations
before the API and worker sync. PostgreSQL must be on the pinned PostGIS image
before a release containing spatial migrations is promoted.

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

`momo-statistics-worker` consumes Core `outbox_event` rows and writes both
place-selection and questionnaire-answer facts to this database. The separate
`momo-statistics-migration` PreSync hook applies only statistics migrations.
Use `pnpm statistics:retry-dead-letter --event-id <id>` for a targeted
manual retry, or `pnpm statistics:rebuild` to reconstruct facts and tags from
the Core outbox.

The separate StatefulSet isolates the database process, credentials, PVC, and
deployment lifecycle. Pod anti-affinity with the maximum weight prefers a node
that is not running Core `momo-postgres`, without allowing the derived database
to block Core recovery. This preference is not a hard node or disk isolation
guarantee. Use dedicated node labels and taints, a separate cluster, or managed
PostgreSQL if the remaining failure domain must be strictly isolated.

Kubernetes readiness continues to call `/health`, which covers the database and
PostGIS dependencies. OCI media diagnostics are available separately at
`/health/storage` and must not be configured as a readiness or liveness probe.

## Read-only database access

Backend developers who only need to inspect Core PostgreSQL tables must not
receive `momo-postgres-auth` or a cluster-admin kubeconfig. The shared base
manifest creates a developer-specific ServiceAccount and binds it to the
`db-reader` Role in each application namespace. That Role can only get and
port-forward the stable `momo-postgres-0` Pod. It cannot list Pods, read
Secrets, access the statistics database, or mutate Kubernetes resources.

An infrastructure administrator issues access with:

```bash
bash scripts/provision-db-reader.sh dev shname /secure/output/dev
bash scripts/provision-db-reader.sh prod shname /secure/output/prod
```

The script creates or rotates the matching PostgreSQL login, grants only
`CONNECT`, schema `USAGE`, and table/sequence `SELECT`, and sets read-only
and timeout defaults. It also grants default `SELECT` privileges for tables
created later by the application database owner. The generated Kubernetes token
is valid for seven days by default; override `DB_READER_TOKEN_DURATION` when a
shorter window is appropriate.

Each output bundle contains a kubeconfig, a `.pgpass` file, and connection
instructions. All generated files and archives use owner-only permissions and
are ignored by Git. Transfer the archive through an approved encrypted channel,
then remove both sender and recipient copies when access is no longer needed.

The recipient must separately have network reachability to the Kubernetes API
through Tailscale. Grant only the cluster-device/API path needed for this task;
do not expose unrelated personal tailnet devices. To revoke access immediately,
delete and recreate the developer ServiceAccount to invalidate its outstanding
tokens, then drop or disable the matching PostgreSQL role.
