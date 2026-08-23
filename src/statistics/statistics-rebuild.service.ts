import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { OutboxEventType } from 'src/outbox/constants/outbox-event-type.constant'
import { DataSource, type EntityManager } from 'typeorm'
import { PlaceTagAggregationService } from './place-tag-aggregation.service'
import { projectCourseConfirmedFacts } from './projectors/course-confirmed-fact.projector'
import {
  CORE_DATABASE_CONNECTION,
  STATISTICS_PIPELINE_ADVISORY_LOCK_KEY,
  STATISTICS_REBUILD_BATCH_SIZE,
} from './statistics.constants'
import { normalizeQueryRows } from './statistics-query.utils'

const PLACE_FACT_COLUMNS = [
  'outbox_event_id',
  'place_id',
  'place_category_id',
  'meeting_id',
  'meeting_type_id',
  'meeting_date',
  'meeting_time',
  'course_version',
  'participant_count',
  'like_count',
  'dislike_count',
  'course_generation_run_id',
  'course_generation_customization_type',
  'course_generation_input_hash',
] as const

const QUESTIONNAIRE_FACT_COLUMNS = [
  'outbox_event_id',
  'question_code',
  'question_text',
  'option_code',
  'option_label',
  'meeting_id',
  'course_generation_run_id',
  'questionnaire_id',
  'course_version',
  'questionnaire_version',
  'questionnaire_schema_version',
  'questionnaire_prompt_version',
  'questionnaire_source',
  'questionnaire_provider',
  'questionnaire_model',
  'input_hash',
] as const

type RebuildOutboxEvent = {
  id: string
  payload: unknown
}

type HighWatermarkRow = {
  highWatermark: string
}

export type StatisticsRebuildResult = {
  highWatermark: string
  eventCount: number
  placeFactCount: number
  questionnaireAnswerFactCount: number
  placeTagCount: number
}

@Injectable()
export class StatisticsRebuildService {
  constructor(
    @InjectDataSource(CORE_DATABASE_CONNECTION)
    private readonly coreDataSource: DataSource,
    @InjectDataSource()
    private readonly statisticsDataSource: DataSource,
    private readonly placeTagAggregationService: PlaceTagAggregationService,
  ) {}

  async rebuild(): Promise<StatisticsRebuildResult> {
    const coreQueryRunner = this.coreDataSource.createQueryRunner()
    await coreQueryRunner.connect()
    let hasExclusiveLock = false

    try {
      await coreQueryRunner.query('SELECT pg_advisory_lock($1)', [
        STATISTICS_PIPELINE_ADVISORY_LOCK_KEY,
      ])
      hasExclusiveLock = true

      const watermarkRows = normalizeQueryRows<HighWatermarkRow>(
        await coreQueryRunner.query(
          `SELECT COALESCE(MAX("id"), 0)::text AS "highWatermark"
           FROM "outbox_event"
           WHERE "event_type" = $1`,
          [OutboxEventType.courseConfirmed],
        ),
      )
      const highWatermark = watermarkRows[0]?.highWatermark ?? '0'

      return await this.statisticsDataSource.transaction(async (manager) => {
        await this.createStagingTables(manager)

        let cursor = '0'
        let eventCount = 0
        let placeFactCount = 0
        let questionnaireAnswerFactCount = 0

        while (true) {
          const events = normalizeQueryRows<RebuildOutboxEvent>(
            await coreQueryRunner.query(
              `SELECT "id", "payload"
               FROM "outbox_event"
               WHERE "event_type" = $1
                 AND "id" > $2
                 AND "id" <= $3
               ORDER BY "id" ASC
               LIMIT $4`,
              [
                OutboxEventType.courseConfirmed,
                cursor,
                highWatermark,
                STATISTICS_REBUILD_BATCH_SIZE,
              ],
            ),
          )
          if (events.length === 0) break

          const placeRows: unknown[][] = []
          const questionnaireRows: unknown[][] = []
          for (const event of events) {
            const projection = projectCourseConfirmedFacts(
              event.id,
              event.payload,
            )
            placeRows.push(
              ...projection.placeSelections.map((fact) => [
                fact.outboxEventId,
                fact.placeId,
                fact.placeCategoryId,
                fact.meetingId,
                fact.meetingTypeId,
                fact.meetingDate,
                fact.meetingTime,
                fact.courseVersion,
                fact.participantCount,
                fact.likeCount,
                fact.dislikeCount,
                fact.courseGenerationRunId,
                fact.courseGenerationCustomizationType,
                fact.courseGenerationInputHash,
              ]),
            )
            questionnaireRows.push(
              ...projection.questionnaireAnswers.map((fact) => [
                fact.outboxEventId,
                fact.questionCode,
                fact.questionText,
                fact.optionCode,
                fact.optionLabel,
                fact.meetingId,
                fact.courseGenerationRunId,
                fact.questionnaireId,
                fact.courseVersion,
                fact.questionnaireVersion,
                fact.questionnaireSchemaVersion,
                fact.questionnairePromptVersion,
                fact.questionnaireSource,
                fact.questionnaireProvider,
                fact.questionnaireModel,
                fact.inputHash,
              ]),
            )
          }

          await this.insertRows(
            manager,
            'rebuild_place_selection_fact',
            PLACE_FACT_COLUMNS,
            placeRows,
          )
          await this.insertRows(
            manager,
            'rebuild_course_questionnaire_answer_fact',
            QUESTIONNAIRE_FACT_COLUMNS,
            questionnaireRows,
          )

          eventCount += events.length
          placeFactCount += placeRows.length
          questionnaireAnswerFactCount += questionnaireRows.length
          cursor = events.at(-1)!.id
        }

        // 긴 payload 변환은 임시 테이블에서 끝낸 뒤, 실제 테이블 교체와
        // 파생 태그 갱신만 짧은 단일 트랜잭션 구간에서 수행한다.
        await manager.query(
          `LOCK TABLE
             "place_selection_fact",
             "course_questionnaire_answer_fact",
             "place_tag"
           IN ACCESS EXCLUSIVE MODE`,
        )
        await manager.query(
          `TRUNCATE TABLE
             "place_selection_fact",
             "course_questionnaire_answer_fact"`,
        )
        await manager.query(
          `INSERT INTO "place_selection_fact" (${PLACE_FACT_COLUMNS.map(
            (column) => `"${column}"`,
          ).join(', ')})
           SELECT ${PLACE_FACT_COLUMNS.map((column) => `"${column}"`).join(
             ', ',
           )}
           FROM "rebuild_place_selection_fact"`,
        )
        await manager.query(
          `INSERT INTO "course_questionnaire_answer_fact" (${QUESTIONNAIRE_FACT_COLUMNS.map(
            (column) => `"${column}"`,
          ).join(', ')})
           SELECT ${QUESTIONNAIRE_FACT_COLUMNS.map(
             (column) => `"${column}"`,
           ).join(', ')}
           FROM "rebuild_course_questionnaire_answer_fact"`,
        )

        const tagResult = await this.placeTagAggregationService.refresh(manager)
        return {
          highWatermark,
          eventCount,
          placeFactCount,
          questionnaireAnswerFactCount,
          placeTagCount: tagResult.total,
        }
      })
    } finally {
      if (hasExclusiveLock) {
        await coreQueryRunner.query('SELECT pg_advisory_unlock($1)', [
          STATISTICS_PIPELINE_ADVISORY_LOCK_KEY,
        ])
      }
      await coreQueryRunner.release()
    }
  }

  private async createStagingTables(manager: EntityManager): Promise<void> {
    await manager.query(
      `CREATE TEMPORARY TABLE "rebuild_place_selection_fact"
       (LIKE "place_selection_fact" INCLUDING ALL)
       ON COMMIT DROP`,
    )
    await manager.query(
      `CREATE TEMPORARY TABLE "rebuild_course_questionnaire_answer_fact"
       (LIKE "course_questionnaire_answer_fact" INCLUDING ALL)
       ON COMMIT DROP`,
    )
  }

  private async insertRows(
    manager: EntityManager,
    table: string,
    columns: readonly string[],
    rows: unknown[][],
  ): Promise<void> {
    if (rows.length === 0) return

    const parameters: unknown[] = []
    const values = rows.map((row) => {
      const placeholders = row.map((value) => {
        parameters.push(value)
        return `$${parameters.length}`
      })
      return `(${placeholders.join(', ')})`
    })
    await manager.query(
      `INSERT INTO "${table}" (${columns
        .map((column) => `"${column}"`)
        .join(', ')}) VALUES ${values.join(', ')}`,
      parameters,
    )
  }
}
