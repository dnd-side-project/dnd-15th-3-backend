import { PreferenceType } from './enums/preference-type.enum'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'

function createRepository(
  rows: { preference: PreferenceType; count: string }[] = [],
) {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  }
  const voteRepository = {
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    upsert: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  }
  const manager = {
    getRepository: jest.fn().mockReturnValue(voteRepository),
  }
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  }
  const repository = new MeetingPlaceRecommendationVoteRepository(
    dataSource as never,
  )

  return { repository, dataSource, manager, voteRepository, queryBuilder }
}

describe('MeetingPlaceRecommendationVoteRepository', () => {
  it('좋아요/싫어요를 설정하면 upsert로 저장하고 삭제는 호출하지 않는다', async () => {
    const { repository, voteRepository } = createRepository([
      { preference: PreferenceType.Like, count: '3' },
    ])

    const result = await repository.applyPreference(
      '1',
      '1',
      PreferenceType.Like,
    )

    expect(voteRepository.upsert).toHaveBeenCalledWith(
      {
        recommendation: { id: '1' },
        participant: { id: '1' },
        preference: PreferenceType.Like,
        updatedAt: expect.any(Date),
      },
      ['recommendation', 'participant'],
    )
    expect(voteRepository.delete).not.toHaveBeenCalled()
    expect(result).toEqual({ likeCount: 3, dislikeCount: 0 })
  })

  it('preference가 null이면 삭제하고 upsert는 호출하지 않는다', async () => {
    const { repository, voteRepository } = createRepository([])

    const result = await repository.applyPreference('1', '1', null)

    expect(voteRepository.delete).toHaveBeenCalledWith({
      recommendation: { id: '1' },
      participant: { id: '1' },
    })
    expect(voteRepository.upsert).not.toHaveBeenCalled()
    expect(result).toEqual({ likeCount: 0, dislikeCount: 0 })
  })

  it('좋아요와 싫어요 개수를 모두 집계해서 반환한다', async () => {
    const { repository, queryBuilder } = createRepository([
      { preference: PreferenceType.Like, count: '5' },
      { preference: PreferenceType.Dislike, count: '2' },
    ])

    const result = await repository.applyPreference(
      '1',
      '1',
      PreferenceType.Dislike,
    )

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'vote.recommendation = :recommendationId',
      { recommendationId: '1' },
    )
    expect(result).toEqual({ likeCount: 5, dislikeCount: 2 })
  })
})

describe('getVoteCountsByRecommendation', () => {
  it('추천 ID가 없으면 쿼리 없이 빈 맵을 반환한다', async () => {
    const { repository, manager, voteRepository } = createRepository()

    const result = await repository.getVoteCountsByRecommendation(
      manager as never,
      [],
    )

    expect(result).toEqual(new Map())
    expect(voteRepository.createQueryBuilder).not.toHaveBeenCalled()
  })

  it('추천 ID별로 좋아요/싫어요 개수를 집계해서 맵으로 반환한다', async () => {
    const { repository, manager, queryBuilder } = createRepository()
    queryBuilder.getRawMany.mockResolvedValue([
      { recommendationId: 'rec-1', likeCount: '2', dislikeCount: '0' },
      { recommendationId: 'rec-2', likeCount: '1', dislikeCount: '1' },
    ])

    const result = await repository.getVoteCountsByRecommendation(
      manager as never,
      ['rec-1', 'rec-2'],
    )

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'vote.recommendation IN (:...recommendationIds)',
      { recommendationIds: ['rec-1', 'rec-2'] },
    )
    expect(queryBuilder.setParameters).toHaveBeenCalledWith({
      like: PreferenceType.Like,
      dislike: PreferenceType.Dislike,
    })
    expect(queryBuilder.groupBy).toHaveBeenCalledWith('vote.recommendation')
    expect(result).toEqual(
      new Map([
        ['rec-1', { likeCount: 2, dislikeCount: 0 }],
        ['rec-2', { likeCount: 1, dislikeCount: 1 }],
      ]),
    )
  })

  it('투표가 하나도 없는 추천 ID는 결과 맵에 포함되지 않는다', async () => {
    const { repository, manager, queryBuilder } = createRepository()
    // rec-2는 투표 행 자체가 없어서 GROUP BY 결과에 아예 안 잡힘 (0으로 채워져 나오지 않음)
    queryBuilder.getRawMany.mockResolvedValue([
      { recommendationId: 'rec-1', likeCount: '2', dislikeCount: '0' },
    ])

    const result = await repository.getVoteCountsByRecommendation(
      manager as never,
      ['rec-1', 'rec-2'],
    )

    expect(result.has('rec-2')).toBe(false)
    expect(result).toEqual(
      new Map([['rec-1', { likeCount: 2, dislikeCount: 0 }]]),
    )
  })
})
