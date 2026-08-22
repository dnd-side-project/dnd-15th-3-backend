import { Injectable, Logger } from '@nestjs/common'
import { normalizeQueryRows } from 'src/common/database/normalize-query-rows'
import { DataSource } from 'typeorm'
import { CourseGenerationProcessor } from './course-generation.processor'

const POLL_INTERVAL_MS = 2_000
const STALE_AFTER_MS = 5 * 60 * 1000

type ClaimedCourseGenerationRun = {
  id: string
}

@Injectable()
export class CourseGenerationWorker {
  private readonly logger = new Logger(CourseGenerationWorker.name)
  private isRunning = true

  constructor(
    private readonly dataSource: DataSource,
    private readonly processor: CourseGenerationProcessor,
  ) {}

  async runOnce(): Promise<boolean> {
    await this.dataSource.query(
      `UPDATE "course_generation_run"
       SET "status" = 'PENDING',
           "started_at" = NULL,
           "updated_at" = CURRENT_TIMESTAMP,
           "error_message" = COALESCE("error_message", '중단된 워커 작업을 재개합니다.')
       WHERE "status" = 'PROCESSING'
         AND "started_at" < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 millisecond')`,
      [STALE_AFTER_MS],
    )

    const result = await this.dataSource.query(`
      UPDATE "course_generation_run"
      SET "status" = 'PROCESSING',
          "attempt_count" = "attempt_count" + 1,
          "started_at" = CURRENT_TIMESTAMP,
          "completed_at" = NULL,
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = (
        SELECT "id"
        FROM "course_generation_run"
        WHERE "status" = 'PENDING'
        ORDER BY "created_at" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING "id"
    `)
    const rows = normalizeQueryRows<ClaimedCourseGenerationRun>(result)
    const runId = rows[0]?.id
    if (!runId) return false

    await this.processor.processRun(runId)
    return true
  }

  async run(): Promise<void> {
    this.logger.log('Course generation worker started')
    while (this.isRunning) {
      try {
        const processed = await this.runOnce()
        if (!processed) await this.delay(POLL_INTERVAL_MS)
      } catch (error) {
        this.logger.error(
          '코스 생성 워커 루프가 실패했습니다.',
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
