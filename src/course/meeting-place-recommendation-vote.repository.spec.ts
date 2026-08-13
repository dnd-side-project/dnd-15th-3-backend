import { PreferenceType } from './enums/preference-type.enum'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'

function createRepository(
  rows: { preference: PreferenceType; count: string }[] = [],
) {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
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

  return { repository, dataSource, voteRepository, queryBuilder }
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
