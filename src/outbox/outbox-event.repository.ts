import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { OutboxAggregateType } from './constants/outbox-aggregate-type.constant'
import type { OutboxEventType } from './constants/outbox-event-type.constant'
import { OutboxEvent } from './entities/outbox-event.entity'

export type CreateOutboxEventInput = {
  eventType: OutboxEventType
  aggregateType: OutboxAggregateType
  aggregateId: string
  payload: Record<string, unknown>
}

@Injectable()
export class OutboxEventRepository {
  create(
    manager: EntityManager,
    input: CreateOutboxEventInput,
  ): Promise<OutboxEvent> {
    const repository = manager.getRepository(OutboxEvent)
    return repository.save(repository.create(input))
  }
}
