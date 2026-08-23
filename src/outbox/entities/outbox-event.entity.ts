import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity, Index } from 'typeorm'
import type { OutboxAggregateType } from '../constants/outbox-aggregate-type.constant'
import type { OutboxEventType } from '../constants/outbox-event-type.constant'
import { OutboxEventStatus } from '../enums/outbox-event-status.enum'

@Entity()
@Index(['status', 'nextRetryAt'])
@Check(`"attempt_count" >= 0`)
@Check(`"aggregate_id" > 0`)
@Check(`length("event_type") >= 1`)
@Check(`length("aggregate_type") >= 1`)
@Check(`("status" = 'PROCESSED') = ("processed_at" IS NOT NULL)`)
@Check(
  `"status" NOT IN ('FAILED', 'DEAD_LETTER') OR "error_message" IS NOT NULL`,
)
@Check(`"next_retry_at" >= "created_at"`)
@Check(`"status" <> 'PROCESSING' OR "started_at" IS NOT NULL`)
export class OutboxEvent extends BaseEntity {
  @Column({ name: 'event_type', type: 'varchar' })
  eventType: OutboxEventType

  @Column({ name: 'aggregate_type', type: 'varchar' })
  aggregateType: OutboxAggregateType

  @Column({ name: 'aggregate_id', type: 'bigint' })
  aggregateId: string

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>

  @Column({
    type: 'enum',
    enum: OutboxEventStatus,
    default: OutboxEventStatus.Pending,
  })
  status: OutboxEventStatus

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount: number

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null

  @Column({ type: 'timestamp', name: 'processed_at', nullable: true })
  processedAt: Date | null

  @Column({ name: 'next_retry_at', default: () => 'CURRENT_TIMESTAMP' })
  nextRetryAt: Date

  // 해당 이벤트를 처리를 시작한(Processing으로 바뀐) 시각. 재시도마다 갱신된
  // 이 값이 오래됐는데 status가 여전히 Processing이면 워커가 죽은 것으로 보고 자동 복구
  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt: Date | null
}
