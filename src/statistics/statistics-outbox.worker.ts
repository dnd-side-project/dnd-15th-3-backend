import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { OutboxEventType } from 'src/outbox/constants/outbox-event-type.constant'
import { DataSource, type QueryRunner } from 'typeorm'
import {
  CORE_DATABASE_CONNECTION,
  STATISTICS_OUTBOX_MAX_ATTEMPTS,
  STATISTICS_OUTBOX_POLL_INTERVAL_MS,
  STATISTICS_OUTBOX_RETRY_DELAYS_MS,
  STATISTICS_OUTBOX_STALE_AFTER_MS,
  STATISTICS_PIPELINE_ADVISORY_LOCK_KEY,
} from './statistics.constants'
import { StatisticsOutboxProcessor } from './statistics-outbox.processor'
import { normalizeQueryRows, serializeError } from './statistics-query.utils'

type ClaimedOutboxEvent = {
  id: string
  eventType: string
  payload: unknown
  attemptCount: number
}

type AdvisoryLockRow = {
  acquired: boolean
}

@Injectable()
export class StatisticsOutboxWorker {
  private readonly logger = new Logger(StatisticsOutboxWorker.name)
  private isRunning = true

  constructor(
    @InjectDataSource(CORE_DATABASE_CONNECTION)
    private readonly coreDataSource: DataSource,
    private readonly processor: StatisticsOutboxProcessor,
  ) {}

  async runOnce(): Promise<boolean> {
    const queryRunner = this.coreDataSource.createQueryRunner()
    await queryRunner.connect()
    let hasSharedLock = false

    try {
      hasSharedLock = await this.tryAcquireSharedPipelineLock(queryRunner)
      if (!hasSharedLock) return false

      await this.recoverStaleEvents(queryRunner)
      const event = await this.claimNextEvent(queryRunner)
      if (!event) return false

      try {
        await this.processor.process(event)
        await this.markProcessed(queryRunner, event.id)
      } catch (error) {
        await this.markFailed(queryRunner, event, error)
      }

      return true
    } finally {
      if (hasSharedLock) {
        await queryRunner.query('SELECT pg_advisory_unlock_shared($1)', [
          STATISTICS_PIPELINE_ADVISORY_LOCK_KEY,
        ])
      }
      await queryRunner.release()
    }
  }

  async run(): Promise<void> {
    this.logger.log('Statistics outbox worker started')
    while (this.isRunning) {
      try {
        const processed = await this.runOnce()
        if (!processed) await this.delay(STATISTICS_OUTBOX_POLL_INTERVAL_MS)
      } catch (error) {
        this.logger.error(
          '통계 Outbox 워커 루프가 실패했습니다.',
          error instanceof Error ? error.stack : String(error),
        )
        await this.delay(STATISTICS_OUTBOX_POLL_INTERVAL_MS)
      }
    }
  }

  stop(): void {
    this.isRunning = false
  }

  private async tryAcquireSharedPipelineLock(
    queryRunner: QueryRunner,
  ): Promise<boolean> {
    const rows = normalizeQueryRows<AdvisoryLockRow>(
      await queryRunner.query(
        'SELECT pg_try_advisory_lock_shared($1) AS "acquired"',
        [STATISTICS_PIPELINE_ADVISORY_LOCK_KEY],
      ),
    )
    return rows[0]?.acquired === true
  }

  private async recoverStaleEvents(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "outbox_event"
       SET "status" = 'FAILED',
           "started_at" = NULL,
           "next_retry_at" = CURRENT_TIMESTAMP,
           "updated_at" = CURRENT_TIMESTAMP,
           "error_message" = COALESCE(
             "error_message",
             '통계 워커가 중단되어 이벤트를 다시 처리합니다.'
           )
       WHERE "event_type" = $1
         AND "status" = 'PROCESSING'
         AND "started_at" < CURRENT_TIMESTAMP - ($2 * INTERVAL '1 millisecond')`,
      [OutboxEventType.courseConfirmed, STATISTICS_OUTBOX_STALE_AFTER_MS],
    )
  }

  private async claimNextEvent(
    queryRunner: QueryRunner,
  ): Promise<ClaimedOutboxEvent | null> {
    const rows = normalizeQueryRows<ClaimedOutboxEvent>(
      await queryRunner.query(
        `UPDATE "outbox_event"
         SET "status" = 'PROCESSING',
             "attempt_count" = "attempt_count" + 1,
             "started_at" = CURRENT_TIMESTAMP,
             "processed_at" = NULL,
             "error_message" = NULL,
             "updated_at" = CURRENT_TIMESTAMP
         WHERE "id" = (
           SELECT "id"
           FROM "outbox_event"
           WHERE "event_type" = $1
             AND "status" IN ('PENDING', 'FAILED')
             AND "next_retry_at" <= CURRENT_TIMESTAMP
           ORDER BY "next_retry_at" ASC, "id" ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         RETURNING
           "id",
           "event_type" AS "eventType",
           "payload",
           "attempt_count" AS "attemptCount"`,
        [OutboxEventType.courseConfirmed],
      ),
    )
    return rows[0] ?? null
  }

  private async markProcessed(
    queryRunner: QueryRunner,
    eventId: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE "outbox_event"
       SET "status" = 'PROCESSED',
           "processed_at" = CURRENT_TIMESTAMP,
           "started_at" = NULL,
           "error_message" = NULL,
           "updated_at" = CURRENT_TIMESTAMP
       WHERE "id" = $1
         AND "status" = 'PROCESSING'`,
      [eventId],
    )
  }

  private async markFailed(
    queryRunner: QueryRunner,
    event: ClaimedOutboxEvent,
    error: unknown,
  ): Promise<void> {
    const isDeadLetter = event.attemptCount >= STATISTICS_OUTBOX_MAX_ATTEMPTS
    const retryDelay = isDeadLetter
      ? 0
      : (STATISTICS_OUTBOX_RETRY_DELAYS_MS[event.attemptCount - 1] ??
        STATISTICS_OUTBOX_RETRY_DELAYS_MS.at(-1)!)
    const message = serializeError(error)

    await queryRunner.query(
      `UPDATE "outbox_event"
       SET "status" = $2,
           "started_at" = NULL,
           "next_retry_at" = CURRENT_TIMESTAMP + ($3 * INTERVAL '1 millisecond'),
           "error_message" = $4,
           "updated_at" = CURRENT_TIMESTAMP
       WHERE "id" = $1
         AND "status" = 'PROCESSING'`,
      [event.id, isDeadLetter ? 'DEAD_LETTER' : 'FAILED', retryDelay, message],
    )

    if (isDeadLetter) {
      this.logger.error(
        `통계 Outbox 이벤트가 DEAD_LETTER로 전환되었습니다. eventId=${event.id}`,
        message,
      )
    } else {
      this.logger.warn(
        `통계 Outbox 이벤트 처리를 재시도합니다. eventId=${event.id} attempt=${event.attemptCount}`,
      )
    }
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
  }
}
