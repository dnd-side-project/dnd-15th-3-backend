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
`OCI_S3_SECRET_KEY`, and `OCI_BUCKET_NAME`.

Kubernetes readiness continues to call `/health`, which covers the database and
PostGIS dependencies. OCI media diagnostics are available separately at
`/health/storage` and must not be configured as a readiness or liveness probe.
