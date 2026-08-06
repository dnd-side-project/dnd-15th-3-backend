# AGENTS.md

Team conventions and development documentation are maintained in the [GitHub Wiki](https://github.com/dnd-side-project/dnd-15th-3-backend/wiki).
This file contains only the repository rules that are easy to miss when working against the current `develop` branch.

## Development environment

- Run `mise run setup` for the initial setup. It runs `mise install` and `pnpm install`.
- The runtime uses Node.js 24 and pnpm 11.15.1. `mise.toml` automatically loads `.env.development`.
- The development database is not a local PostgreSQL instance. `mise run db-forward-dev` port-forwards the `momo-postgres` StatefulSet in the `dnd-15th-3-dev` namespace to `localhost:15432`.
- Run `mise run dev-api` for a local API connected to the cluster database. This command reads the database credentials from the cluster Secret, starts the database port-forward, and runs `pnpm start:dev`. It requires an appropriate Kubernetes context and `kubectl` access.
- Redis commands are `mise run redis-start`, `mise run redis-stop`, and `mise run redis-cli`.
- The API global prefix is `/api/v1`. The readiness/startup endpoints `GET /health` and `GET /health/live` are excluded from the prefix. Swagger is available at `/api/v1/docs`.

## Verification

- Run `pnpm run ci` before committing. It runs `biome check .`, typechecking, and Jest tests in the same sequence as CI.
- Run individual checks with `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run test:e2e`.
- `pnpm ci` is not the same as `pnpm run ci`. Always use `pnpm run ci` to run the repository checks.

## Git and deployment

- Create feature branches from `develop` using `{type}/{kebab-case-name}` and target regular PRs at `develop`. Promote production releases from `develop` to `main`.
- Write commit titles and PR titles/bodies in Korean. Only the `type(scope):` prefix in commit titles stays in English.
- Pushes to `develop` and `main` trigger GitHub Actions for CI and image processing, and Argo CD deploys the corresponding environment. Argo CD Image Updater applies image tags for `develop`; CI records image tags in the manifests for `main`.
- Manage deployment manifests under `deploy/k8s/` through GitOps. Do not run `kubectl apply` directly against the cluster or use Delete/Sync in the Argo CD UI.

## Configuration and safety rules

- Use `DB_SYNCHRONIZE=true` only with a local development database. Never enable it for the development cluster or production database.
- Never commit plaintext Secrets or real `.env` files. Create Kubernetes Secrets as SealedSecrets with `kubeseal --cert deploy/sealed-secrets.pub.pem`.
- Add new environment variables to the Zod schema in `src/config/env.ts` and to `.env.example`. If a variable is used in a deployed environment, also update `deploy/k8s/overlays/{develop,main}/environment.yaml` or the relevant SealedSecret.
- When adding a boot-time dependency such as a database or external service, update the checks in `GET /health`. Kubernetes startup/readiness probes use this endpoint.
- The API must not proxy file bytes. Transfer files directly through OCI Object Storage: use presigned URLs for private objects and direct URLs for public objects.

## Code conventions

- Keep only code shared by two or more domains in `src/common/`. Code used by one domain belongs in that domain's folder.
- Use relative imports within a domain and absolute `src/` imports across domains.
- Use kebab-case for file names and colocate tests with the code under test as `*.spec.ts` files.
- Biome, lefthook, and commitlint enforce formatting, lint, and commit-message structure. If a hook fails, fix the code instead of relaxing the configuration.
