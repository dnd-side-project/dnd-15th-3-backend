import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { DataSource } from 'typeorm'
import { MeetingPlaceRecommendationRepository } from './meeting-place-recommendation.repository'

function createRepository() {
  const queryBuilder = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }
  const recommendationRepository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
  }
  const dataSource = {
    getRepository: jest.fn().mockReturnValue(recommendationRepository),
  }
  const repository = new MeetingPlaceRecommendationRepository(
    dataSource as unknown as DataSource,
  )

  return { repository, dataSource, queryBuilder, recommendationRepository }
}

describe('MeetingPlaceRecommendationRepository', () => {
  describe('findExcludedFromCourse', () => {
    it('코스 후보에 없는 추천만 조회하도록 안티조인 조건을 건다', async () => {
      const { repository, queryBuilder } = createRepository()

      await repository.findExcludedFromCourse('1', '2', undefined)

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        expect.anything(),
        'candidatePlace',
        'candidatePlace.meeting_place_recommendation_id = recommendation.id AND candidatePlace.course_candidate_id = :courseCandidateId',
        { courseCandidateId: '2' },
      )
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'recommendation.meeting_id = :meetingId',
        { meetingId: '1' },
      )
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'candidatePlace.id IS NULL',
      )
    })

    it('카테고리 필터가 없으면 카테고리 조건을 추가하지 않는다', async () => {
      const { repository, queryBuilder } = createRepository()

      await repository.findExcludedFromCourse('1', '2', undefined)

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1)
    })

    it('카테고리 필터가 있으면 조건을 추가로 건다', async () => {
      const { repository, queryBuilder } = createRepository()

      await repository.findExcludedFromCourse('1', '2', CategorySlug.Cafe)

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'category.slug = :categorySlug',
        { categorySlug: CategorySlug.Cafe },
      )
    })

    it('조회 결과를 그대로 반환한다', async () => {
      const { repository, queryBuilder } = createRepository()
      const recommendations = [{ id: '1' }]
      queryBuilder.getMany.mockResolvedValue(recommendations)

      await expect(
        repository.findExcludedFromCourse('1', '2', undefined),
      ).resolves.toEqual(recommendations)
    })
  })
})
