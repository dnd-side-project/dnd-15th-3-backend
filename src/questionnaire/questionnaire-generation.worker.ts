import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { QuestionnaireGenerationProcessor } from './questionnaire-generation.processor'

const POLL_INTERVAL_MS = 500
const STALE_AFTER_MS = 60_000

type ClaimedQuestionnaire = {
  id: string
  generationAttemptCount: number
}

@Injectable()
export class QuestionnaireGenerationWorker {
  private readonly logger = new Logger(QuestionnaireGenerationWorker.name)
  private isRunning = true

  constructor(
    private readonly dataSource: DataSource,
    private readonly processor: QuestionnaireGenerationProcessor,
  ) {}

  async runOnce(): Promise<boolean> {
    const result = (await this.dataSource.query(
      `UPDATE "meeting_questionnaire"
       SET "generation_attempt_count" = "generation_attempt_count" + 1,
           "generation_started_at" = CURRENT_TIMESTAMP,
           "updated_at" = CURRENT_TIMESTAMP
       WHERE "id" = (
         SELECT "id"
         FROM "meeting_questionnaire"
         WHERE "generation_status" = 'GENERATING'
           AND (
             "generation_started_at" IS NULL
             OR "generation_started_at" < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 millisecond')
           )
         ORDER BY "created_at" ASC, "id" ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING "id", "generation_attempt_count" AS "generationAttemptCount"`,
      [STALE_AFTER_MS],
    )) as ClaimedQuestionnaire[] | [ClaimedQuestionnaire[], number]
    const rows = Array.isArray(result[0])
      ? (result[0] as ClaimedQuestionnaire[])
      : (result as ClaimedQuestionnaire[])
    const questionnaire = rows[0]
    if (
      !questionnaire?.id ||
      !Number.isInteger(questionnaire.generationAttemptCount)
    ) {
      return false
    }

    await this.processor.processQuestionnaire(
      questionnaire.id,
      questionnaire.generationAttemptCount,
    )
    return true
  }

  async run(): Promise<void> {
    this.logger.log('Questionnaire generation worker started')
    while (this.isRunning) {
      try {
        const processed = await this.runOnce()
        if (!processed) await this.delay(POLL_INTERVAL_MS)
      } catch (error) {
        this.logger.error(
          '모임 질문 생성 워커 루프가 실패했습니다.',
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
