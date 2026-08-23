import { StatisticsOutboxProcessor } from './statistics-outbox.processor'

const validV1Payload = {
  meetingId: '10',
  meetingTypeId: '20',
  meetingDate: '2026-08-22',
  meetingTime: '18:30:00',
  courseVersion: 1,
  payloadVersion: 1,
  participantCount: 2,
  places: [
    {
      placeId: '30',
      placeCategoryId: '40',
      likeCount: 1,
      dislikeCount: 1,
    },
  ],
}

describe('StatisticsOutboxProcessor', () => {
  it('동일 이벤트의 기존 Fact를 교체한 뒤 태그를 갱신한다', async () => {
    const placeRepository = { delete: jest.fn(), insert: jest.fn() }
    const answerRepository = { delete: jest.fn(), insert: jest.fn() }
    const manager = {
      query: jest.fn(),
      getRepository: jest
        .fn()
        .mockReturnValueOnce(placeRepository)
        .mockReturnValueOnce(answerRepository),
    }
    const statisticsDataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    }
    const tagService = { refresh: jest.fn() }
    const processor = new StatisticsOutboxProcessor(
      statisticsDataSource as never,
      tagService as never,
    )

    await processor.process({
      id: '50',
      eventType: 'COURSE_CONFIRMED',
      payload: validV1Payload,
    })

    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1)',
      [1_508_871_338],
    )
    expect(answerRepository.delete).toHaveBeenCalledWith({
      outboxEventId: '50',
    })
    expect(placeRepository.delete).toHaveBeenCalledWith({
      outboxEventId: '50',
    })
    expect(placeRepository.insert).toHaveBeenCalledWith([
      expect.objectContaining({ outboxEventId: '50', placeId: '30' }),
    ])
    expect(answerRepository.insert).not.toHaveBeenCalled()
    expect(tagService.refresh).toHaveBeenCalledWith(manager)
  })

  it('지원하지 않는 이벤트는 통계 트랜잭션 전에 거부한다', async () => {
    const statisticsDataSource = { transaction: jest.fn() }
    const processor = new StatisticsOutboxProcessor(
      statisticsDataSource as never,
      { refresh: jest.fn() } as never,
    )

    await expect(
      processor.process({ id: '1', eventType: 'UNKNOWN', payload: {} }),
    ).rejects.toThrow('지원하지 않는 통계 Outbox 이벤트')
    expect(statisticsDataSource.transaction).not.toHaveBeenCalled()
  })
})
