import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { normalizeQueryRows } from './normalize-query-rows'
import { PLACE_SYNC_STALE_AFTER_MS } from './place-sync.constants'
import { PlaceSyncService } from './place-sync.service'

const POLL_INTERVAL_MS = 5_000

type ClaimedPlaceSyncJob = {
  id: string
}

@Injectable()
export class PlaceSyncWorker {
  private readonly logger = new Logger(PlaceSyncWorker.name)
  private isRunning = true

  constructor(
    private readonly dataSource: DataSource,
    private readonly placeSyncService: PlaceSyncService,
  ) {}

  async runOnce(): Promise<boolean> {
    await this.dataSource.query(
      `
      UPDATE "place_sync_job"
      SET
        "status" = 'PENDING',
        "next_run_at" = CURRENT_TIMESTAMP,
        "updated_at" = CURRENT_TIMESTAMP,
        "error_message" = COALESCE(
          "error_message",
          'Worker가 중단되어 작업을 재개합니다.'
        )
      WHERE "status" = 'RUNNING'
        AND "started_at" < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 millisecond')
    `,
      [PLACE_SYNC_STALE_AFTER_MS],
    )

    const result = await this.dataSource.query(`
      UPDATE "place_sync_job"
      SET
        "status" = 'RUNNING',
        "attempt_count" = "attempt_count" + 1,
        "started_at" = CURRENT_TIMESTAMP,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = (
        SELECT "id"
        FROM "place_sync_job"
        WHERE "status" = 'PENDING'
          AND "next_run_at" <= CURRENT_TIMESTAMP
        ORDER BY "next_run_at" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING "id"
    `)
    const rows = normalizeQueryRows<ClaimedPlaceSyncJob>(result)
    const jobId = rows[0]?.id
    if (!jobId) return false

    await this.placeSyncService.processJob(jobId)
    return true
  }

  async run(): Promise<void> {
    this.logger.log('Place sync worker started')
    while (this.isRunning) {
      try {
        const processed = await this.runOnce()
        if (!processed) await this.delay(POLL_INTERVAL_MS)
      } catch (error) {
        this.logger.error(
          'Place sync worker loop failed',
          error instanceof Error ? error.stack : String(error),
        )
        await this.delay(POLL_INTERVAL_MS)
      }
    }
  }

  stop(): void {
    this.isRunning = false
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
  }
}
