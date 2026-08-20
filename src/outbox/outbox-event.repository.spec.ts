import { OutboxAggregateType } from './constants/outbox-aggregate-type.constant'
import { OutboxEventType } from './constants/outbox-event-type.constant'
import { OutboxEvent } from './entities/outbox-event.entity'
import { OutboxEventRepository } from './outbox-event.repository'

function createManagerMocks() {
  const savedEvent = { id: '1' }
  const outboxEventRepository = {
    create: jest.fn((input: unknown) => input),
    save: jest.fn().mockResolvedValue(savedEvent),
  }
  const manager = {
    getRepository: jest.fn(() => outboxEventRepository),
  }

  return { manager, outboxEventRepository, savedEvent }
}

describe('OutboxEventRepository', () => {
  describe('create', () => {
    it('입력값으로 엔티티를 만들어 저장한다', async () => {
      const repository = new OutboxEventRepository()
      const { manager, outboxEventRepository, savedEvent } =
        createManagerMocks()
      const input = {
        eventType: OutboxEventType.courseConfirmed,
        aggregateType: OutboxAggregateType.meeting,
        aggregateId: '1',
        payload: { meetingId: '1' },
      }

      await expect(repository.create(manager as never, input)).resolves.toBe(
        savedEvent,
      )

      expect(manager.getRepository).toHaveBeenCalledWith(OutboxEvent)
      expect(outboxEventRepository.create).toHaveBeenCalledWith(input)
      expect(outboxEventRepository.save).toHaveBeenCalledWith(input)
    })
  })
})
