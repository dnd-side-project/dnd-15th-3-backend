import { StatisticsRebuildService } from './statistics-rebuild.service'

function createPayload(meetingId: string, placeId: string) {
  return {
    meetingId,
    meetingTypeId: '20',
    meetingDate: '2026-08-22',
    meetingTime: '18:30:00',
    courseVersion: 1,
    payloadVersion: 1,
    participantCount: 1,
    places: [
      {
        placeId,
        placeCategoryId: '40',
        likeCount: 1,
        dislikeCount: 0,
      },
    ],
  }
}

describe('StatisticsRebuildService', () => {
  it('high-watermark까지 두 Fact를 staging에 만든 뒤 원본과 교체한다', async () => {
    const coreQuery = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ highWatermark: '2' }])
      .mockResolvedValueOnce([
        { id: '1', payload: createPayload('10', '30') },
        { id: '2', payload: createPayload('11', '31') },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    const coreQueryRunner = {
      connect: jest.fn(),
      query: coreQuery,
      release: jest.fn(),
    }
    const manager = { query: jest.fn().mockResolvedValue([]) }
    const statisticsDataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    }
    const tagService = {
      refresh: jest
        .fn()
        .mockResolvedValue({ inserted: 1, deleted: 0, total: 1 }),
    }
    const service = new StatisticsRebuildService(
      { createQueryRunner: () => coreQueryRunner } as never,
      statisticsDataSource as never,
      tagService as never,
    )

    await expect(service.rebuild()).resolves.toEqual({
      highWatermark: '2',
      eventCount: 2,
      placeFactCount: 2,
      questionnaireAnswerFactCount: 0,
      placeTagCount: 1,
    })

    expect(coreQuery.mock.calls[2][0]).toContain('"id" <= $3')
    expect(manager.query.mock.calls[2][0]).toContain(
      'INSERT INTO "rebuild_place_selection_fact"',
    )
    expect(
      manager.query.mock.calls.some(([sql]) => sql.includes('TRUNCATE TABLE')),
    ).toBe(true)
    expect(tagService.refresh).toHaveBeenCalledWith(manager)
    expect(coreQuery.mock.calls.at(-1)?.[0]).toContain('pg_advisory_unlock')
    expect(coreQueryRunner.release).toHaveBeenCalled()
  })
})
