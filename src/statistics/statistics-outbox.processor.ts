import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { OutboxEventType } from 'src/outbox/constants/outbox-event-type.constant'
import { DataSource } from 'typeorm'
import { CourseQuestionnaireAnswerFact } from './entities/course-questionnaire-answer-fact.stats-entity'
import { PlaceSelectionFact } from './entities/place-selection-fact.stats-entity'
import { PlaceTagAggregationService } from './place-tag-aggregation.service'
import { projectCourseConfirmedFacts } from './projectors/course-confirmed-fact.projector'
import { STATISTICS_AGGREGATION_ADVISORY_LOCK_KEY } from './statistics.constants'

export type StatisticsOutboxEvent = {
  id: string
  eventType: string
  payload: unknown
}

@Injectable()
export class StatisticsOutboxProcessor {
  constructor(
    @InjectDataSource()
    private readonly statisticsDataSource: DataSource,
    private readonly placeTagAggregationService: PlaceTagAggregationService,
  ) {}

  async process(event: StatisticsOutboxEvent): Promise<void> {
    if (event.eventType !== OutboxEventType.courseConfirmed) {
      throw new Error(
        `지원하지 않는 통계 Outbox 이벤트입니다: ${event.eventType}`,
      )
    }

    const projection = projectCourseConfirmedFacts(event.id, event.payload)

    await this.statisticsDataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [
        STATISTICS_AGGREGATION_ADVISORY_LOCK_KEY,
      ])
      const placeSelectionRepository = manager.getRepository(PlaceSelectionFact)
      const questionnaireAnswerRepository = manager.getRepository(
        CourseQuestionnaireAnswerFact,
      )

      // Core와 통계 DB 사이에는 분산 트랜잭션이 없다. 동일 이벤트를 다시
      // 처리해도 정확히 같은 row 집합이 되도록 이벤트 단위로 교체한다.
      await questionnaireAnswerRepository.delete({ outboxEventId: event.id })
      await placeSelectionRepository.delete({ outboxEventId: event.id })

      if (projection.placeSelections.length > 0) {
        await placeSelectionRepository.insert(projection.placeSelections)
      }
      if (projection.questionnaireAnswers.length > 0) {
        await questionnaireAnswerRepository.insert(
          projection.questionnaireAnswers,
        )
      }

      await this.placeTagAggregationService.refresh(manager)
    })
  }
}
