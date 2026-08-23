import { PlaceTagCode } from './enums/place-tag-code.enum'
import { PlaceTagAggregationService } from './place-tag-aggregation.service'

describe('PlaceTagAggregationService', () => {
  it('최신 코스 버전 지표를 계산해 생성·제거 태그를 동기화한다', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          placeId: '1',
          evaluationCount: '10',
          likeCount: '7',
          dislikeCount: '3',
          selectionCount: '5',
          globalRankPosition: '1',
          globalPopulationCount: '2',
        },
        {
          placeId: '2',
          evaluationCount: '10',
          likeCount: '4',
          dislikeCount: '6',
          selectionCount: '1',
          globalRankPosition: '2',
          globalPopulationCount: '2',
        },
      ])
      .mockResolvedValueOnce([
        {
          placeId: '1',
          segmentKey: '10',
          totalMeetingCount: '20',
          selectionCount: '6',
          selectionRatio: 0.3,
        },
      ])
      .mockResolvedValueOnce([
        {
          placeId: '1',
          segmentKey: 'WEEKEND',
          totalMeetingCount: '20',
          selectionCount: '6',
          selectionRatio: 0.3,
        },
      ])
      .mockResolvedValueOnce([
        {
          placeId: '1',
          selectionCount: '5',
          rankPosition: '1',
          populationCount: '2',
        },
      ])
      .mockResolvedValueOnce([
        { placeId: '2', tagCode: PlaceTagCode.HighPreference },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    const service = new PlaceTagAggregationService()

    const result = await service.refresh({ query } as never)

    expect(result).toEqual({ inserted: 5, deleted: 1, total: 5 })
    expect(query.mock.calls[0][0]).toContain('MAX("course_version")')
    expect(query.mock.calls[2][0]).toContain('EXTRACT(ISODOW')
    expect(query.mock.calls[3][0]).toContain('PARTITION BY')
    expect(query.mock.calls[5][0]).toContain('INSERT INTO "place_tag"')
    expect(query.mock.calls[5][1]).toEqual(
      expect.arrayContaining([
        '1',
        PlaceTagCode.HighPreference,
        PlaceTagCode.MeetingPreferred,
        PlaceTagCode.WeekendPreferred,
        PlaceTagCode.FrequentlySelected,
        PlaceTagCode.CategoryPopular,
      ]),
    )
    expect(query.mock.calls[6][0]).toContain('DELETE FROM "place_tag"')
    expect(query.mock.calls[6][1]).toEqual(['2', PlaceTagCode.HighPreference])
  })
})
