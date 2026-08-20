import { getMetadataArgsStorage } from 'typeorm'
import { OutboxEventStatus } from '../enums/outbox-event-status.enum'
import { OutboxEvent } from './outbox-event.entity'

describe('OutboxEvent entity', () => {
  it('nullable 컬럼이 명시적 PostgreSQL 타입을 유지한다', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === OutboxEvent,
    )
    const optionsByProperty = new Map(
      columns.map((column) => [column.propertyName, column.options]),
    )

    expect(optionsByProperty.get('errorMessage')).toMatchObject({
      type: 'text',
      nullable: true,
    })
    expect(optionsByProperty.get('processedAt')).toMatchObject({
      type: 'timestamp',
      nullable: true,
    })
    expect(optionsByProperty.get('startedAt')).toMatchObject({
      type: 'timestamp',
      nullable: true,
    })
  })

  it('status 컬럼이 OutboxEventStatus enum과 기본값 Pending으로 등록된다', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === OutboxEvent,
    )
    const optionsByProperty = new Map(
      columns.map((column) => [column.propertyName, column.options]),
    )

    expect(optionsByProperty.get('status')).toMatchObject({
      type: 'enum',
      enum: OutboxEventStatus,
      default: OutboxEventStatus.Pending,
    })
  })

  it('의도한 CHECK 제약 조건이 모두 등록된다', () => {
    const expressions = getMetadataArgsStorage()
      .checks.filter((check) => check.target === OutboxEvent)
      .map((check) => check.expression)
      .sort()

    expect(expressions).toEqual(
      [
        `"attempt_count" >= 0`,
        `"aggregate_id" > 0`,
        `length("event_type") >= 1`,
        `length("aggregate_type") >= 1`,
        `("status" = '${OutboxEventStatus.Processed}') = ("processed_at" IS NOT NULL)`,
        `"status" NOT IN ('${OutboxEventStatus.Failed}', '${OutboxEventStatus.DeadLetter}') OR "error_message" IS NOT NULL`,
        `"next_retry_at" >= "created_at"`,
        `"status" <> '${OutboxEventStatus.Processing}' OR "started_at" IS NOT NULL`,
      ].sort(),
    )
  })

  it('폴링용 인덱스가 status, nextRetryAt 순서로 걸려있다', () => {
    const indices = getMetadataArgsStorage().indices.filter(
      (index) => index.target === OutboxEvent,
    )

    expect(indices).toHaveLength(1)
    expect(indices[0].columns).toEqual(['status', 'nextRetryAt'])
  })
})
