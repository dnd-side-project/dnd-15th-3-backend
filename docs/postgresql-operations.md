# PostgreSQL 운영 가이드

K3s 내부 PostgreSQL은 Prod와 Dev namespace에 각각 하나씩 배포됩니다. 두 인스턴스는 `local-path` RWO PVC를 사용하며, 매일 OCI Object Storage에 custom-format dump를 저장합니다.

## 리소스

| 환경 | Namespace | Service | StatefulSet | PVC 크기 | 백업 prefix |
| --- | --- | --- | --- | --- | --- |
| Prod | `dnd-15th-3` | `momo-postgres` | `momo-postgres-0` | `data-momo-postgres-0` (10Gi) | `postgresql/prod` |
| Dev | `dnd-15th-3-dev` | `momo-postgres` | `momo-postgres-0` | `data-momo-postgres-0` (5Gi) | `postgresql/dev` |

API는 두 환경 모두 `momo-postgres:5432`로 접속합니다. DB 인증 정보는 `momo-postgres-auth` SealedSecret에서 생성됩니다.

## 상태 확인

```bash
kubectl -n dnd-15th-3 get statefulset,pod,service momo-postgres
kubectl -n dnd-15th-3 get pvc data-momo-postgres-0
kubectl -n dnd-15th-3-dev get statefulset,pod,service momo-postgres
kubectl -n dnd-15th-3-dev get pvc data-momo-postgres-0

kubectl -n dnd-15th-3 rollout status statefulset/momo-postgres
kubectl -n dnd-15th-3-dev rollout status statefulset/momo-postgres
kubectl -n dnd-15th-3 rollout status deployment/momo-api
kubectl -n dnd-15th-3-dev rollout status deployment/momo-api
```

Pod가 `CrashLoopBackOff`이면 먼저 DB 로그와 API 로그를 확인합니다.

```bash
kubectl -n dnd-15th-3 logs statefulset/momo-postgres
kubectl -n dnd-15th-3 logs deployment/momo-api --tail=100
```

## 백업

백업 CronJob은 매일 한국 시간 오전 4시에 실행됩니다. OCI Object Storage의 다음 경로에 dump를 저장합니다.

```text
postgresql/prod/momo-<UTC timestamp>.dump
postgresql/dev/momo-<UTC timestamp>.dump
```

14일보다 오래된 파일은 같은 CronJob에서 삭제합니다. 수동 백업은 다음과 같이 실행합니다.

```bash
BACKUP_JOB="momo-postgres-backup-manual-$(date +%Y%m%d%H%M%S)"
kubectl -n dnd-15th-3 create job "$BACKUP_JOB" --from=cronjob/momo-postgres-backup
kubectl -n dnd-15th-3 wait --for=condition=complete "job/$BACKUP_JOB" --timeout=30m
kubectl -n dnd-15th-3 logs "job/$BACKUP_JOB"
```

Dev 백업은 namespace만 `dnd-15th-3-dev`로 바꿔 실행합니다.

## 복구

1. OCI에서 복구할 dump를 `/tmp/momo-restore.dump`로 다운로드합니다.
2. 새 PostgreSQL Pod가 Ready인지 확인합니다.
3. dump 파일을 Pod로 복사합니다.

```bash
kubectl -n dnd-15th-3 cp /tmp/momo-restore.dump momo-postgres-0:/tmp/momo-restore.dump
```

4. 기존 객체를 정리하며 복구합니다.

```bash
kubectl -n dnd-15th-3 exec momo-postgres-0 -- sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  --clean --if-exists --no-owner --no-privileges \
  --host=localhost --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" /tmp/momo-restore.dump'
```

5. 복구 후 API health endpoint와 핵심 API를 확인합니다.

## PVC와 장애 범위

- StatefulSet을 삭제하거나 replica를 줄여도 PVC는 `Retain` 정책으로 보존됩니다.
- `local-path`는 노드 로컬 디스크를 사용합니다. PVC가 특정 노드에 묶이므로 해당 노드가 완전히 손실되면 OCI dump에서 복구해야 합니다.
- PostgreSQL replica를 늘려도 현재 스토리지 구조에서는 고가용성 구성이 되지 않습니다.
- `POSTGRES_PASSWORD`는 빈 PVC를 처음 초기화할 때만 PostgreSQL 비밀번호를 설정합니다. 비밀번호를 회전할 때는 먼저 DB에서 `ALTER ROLE momo PASSWORD ...`를 실행하고, 같은 값을 새 SealedSecret에 반영한 뒤 Pod를 재시작합니다.
- `momo-postgres-auth`와 API의 기존 `momo-api-env`를 직접 삭제하지 않습니다. SealedSecret 변경은 새 ciphertext를 생성한 뒤 적용합니다.
