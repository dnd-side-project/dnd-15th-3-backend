import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PLACE_SYNC_STALE_AFTER_MS } from './place-sync.constants'
import { PlaceSyncService } from './place-sync.service'

const POLL_INTERVAL_MS = 5_000

@Injectable()
export class PlaceSyncWorker {
  private readonly logger = new Logger(PlaceSyncWorker.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly placeSyncService: PlaceSyncService,
  ) {}

  async runOnce(): Promise<boolean> {
    await this.dataSource.query(`
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
        AND "started_at" < CURRENT_TIMESTAMP - INTERVAL '${PLACE_SYNC_STALE_AFTER_MS} milliseconds'
    `)

    const rows = await this.dataSource.query(`
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

    const jobId = rows[0]?.id as string | undefined
    if (!jobId) return false

    await this.placeSyncService.processJob(jobId)
    return true
  }

  async run(): Promise<void> {
    this.logger.log('Place sync worker started')
    while (true) {
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

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
  }
}
