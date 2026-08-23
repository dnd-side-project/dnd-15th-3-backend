import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { OutboxEventType } from 'src/outbox/constants/outbox-event-type.constant'
import { DataSource } from 'typeorm'
import { CORE_DATABASE_CONNECTION } from './statistics.constants'
import { normalizeQueryRows } from './statistics-query.utils'
import {
  type StatisticsRebuildResult,
  StatisticsRebuildService,
} from './statistics-rebuild.service'

type RetriedEventRow = { id: string }

@Injectable()
export class StatisticsAdminService {
  constructor(
    @InjectDataSource(CORE_DATABASE_CONNECTION)
    private readonly coreDataSource: DataSource,
    private readonly statisticsRebuildService: StatisticsRebuildService,
  ) {}

  rebuild(): Promise<StatisticsRebuildResult> {
    return this.statisticsRebuildService.rebuild()
  }

  async retryDeadLetters(eventIds: string[] | null): Promise<string[]> {
    if (eventIds?.some((id) => !/^[1-9]\d*$/.test(id))) {
      throw new Error('event id는 1 이상의 정수여야 합니다.')
    }

    const parameters: unknown[] = [OutboxEventType.courseConfirmed]
    const idFilter = eventIds ? `AND "id" = ANY($2::bigint[])` : ''
    if (eventIds) parameters.push(eventIds)

    const rows = normalizeQueryRows<RetriedEventRow>(
      await this.coreDataSource.query(
        `UPDATE "outbox_event"
         SET "status" = 'PENDING',
             "attempt_count" = 0,
             "error_message" = NULL,
             "processed_at" = NULL,
             "started_at" = NULL,
             "next_retry_at" = CURRENT_TIMESTAMP,
             "updated_at" = CURRENT_TIMESTAMP
         WHERE "event_type" = $1
           AND "status" = 'DEAD_LETTER'
           ${idFilter}
         RETURNING "id"`,
        parameters,
      ),
    )
    return rows.map((row) => row.id)
  }
}
