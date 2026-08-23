export const CORE_DATABASE_CONNECTION = 'core'

export const STATISTICS_OUTBOX_POLL_INTERVAL_MS = 2_000
export const STATISTICS_OUTBOX_STALE_AFTER_MS = 5 * 60 * 1000
export const STATISTICS_OUTBOX_MAX_ATTEMPTS = 5
export const STATISTICS_OUTBOX_RETRY_DELAYS_MS = [
  1_000,
  5_000,
  30_000,
  2 * 60 * 1000,
] as const

export const STATISTICS_REBUILD_BATCH_SIZE = 200

// 통계 소비자끼리만 공유하는 PostgreSQL advisory lock key다.
// 실시간 워커는 shared lock, 전체 재구성은 exclusive lock을 사용한다.
export const STATISTICS_PIPELINE_ADVISORY_LOCK_KEY = 1_508_871_337

// 여러 워커가 동시에 Fact를 적재하더라도 마지막 태그 계산이 전체 Fact를
// 보도록 통계 DB 안의 적재 트랜잭션을 직렬화한다.
export const STATISTICS_AGGREGATION_ADVISORY_LOCK_KEY = 1_508_871_338
