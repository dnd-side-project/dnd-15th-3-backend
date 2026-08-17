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

The media credentials should be limited to writing objects in that environment's
media bucket. The buckets are public for object reads without list access; the old
`momo-bucket-*` buckets remain private and are used only for PostgreSQL backups.

The PostgreSQL backup CronJob loads its Object Storage configuration from a
separate `momo-postgres-backup-storage` Secret in each database namespace. It
requires `OCI_REGION`, `OCI_NAMESPACE`, `OCI_S3_ACCESS_KEY`,
`OCI_S3_SECRET_KEY`, and `OCI_BUCKET_NAME`.

Kubernetes readiness continues to call `/health`, which covers the database and
PostGIS dependencies. OCI media diagnostics are available separately at
`/health/storage` and must not be configured as a readiness or liveness probe.
