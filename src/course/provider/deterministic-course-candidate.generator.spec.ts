import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from 'src/questionnaire/questionnaire.constants'
import type {
  CourseGenerationInputSnapshot,
  CourseGenerationRuntimeInput,
} from '../schema/course-generation-input.schema'
import { DeterministicCourseCandidateGenerator } from './deterministic-course-candidate.generator'

function createInput(
  answers: CourseGenerationInputSnapshot['questionnaire'] = null,
): CourseGenerationRuntimeInput {
  return {
    schemaVersion: 1,
    meeting: {
      meetingId: '1',
      meetingTypeId: '2',
      meetingTypeCode: MeetingTypeCode.Social,
      date: '2026-08-22',
      time: '18:30:00',
      courseVersion: 1,
      location: { latitude: 37.5, longitude: 127 },
    },
    participantCount: 4,
    categorySteps: [
      { order: 1, categoryId: '10', categorySlug: CategorySlug.Restaurant },
      { order: 2, categoryId: '20', categorySlug: CategorySlug.Cafe },
    ],
    recommendations: [
      {
        recommendationId: '101',
        placeId: '1001',
        placeCategoryId: '10',
        categorySlug: CategorySlug.Restaurant,
        name: '가까운 식당',
        address: '주소 1',
        latitude: 37.5001,
        longitude: 127.0001,
        likeCount: 3,
        dislikeCount: 0,
      },
      {
        recommendationId: '102',
        placeId: '1002',
        placeCategoryId: '10',
        categorySlug: CategorySlug.Restaurant,
        name: '새로운 식당',
        address: '주소 2',
        latitude: 37.51,
        longitude: 127.01,
        likeCount: 0,
        dislikeCount: 0,
      },
      {
        recommendationId: '201',
        placeId: '2001',
        placeCategoryId: '20',
        categorySlug: CategorySlug.Cafe,
        name: '인기 카페',
        address: '주소 3',
        latitude: 37.5101,
        longitude: 127.0101,
        likeCount: 3,
        dislikeCount: 0,
      },
      {
        recommendationId: '202',
        placeId: '2002',
        placeCategoryId: '20',
        categorySlug: CategorySlug.Cafe,
        name: '새로운 카페',
        address: '주소 4',
        latitude: 37.5002,
        longitude: 127.0002,
        likeCount: 0,
        dislikeCount: 0,
      },
    ],
    questionnaire: answers,
  }
}

describe('DeterministicCourseCandidateGenerator', () => {
  it('질문 응답이 없으면 취향 점수와 이동거리 기준 후보를 만든다', async () => {
    const generator = new DeterministicCourseCandidateGenerator()

    const result = await generator.generate(createInput())

    expect(result.candidates).toEqual([
      {
        name: '모두의 취향 코스',
        recommendationIds: ['101', '201'],
      },
      {
        name: '가까운 동선 코스',
        recommendationIds: ['101', '202'],
      },
      {
        name: '새로운 발견 코스',
        recommendationIds: ['102', '202'],
      },
    ])
  })

  it('새로운 경험·효율·아늑함 응답을 선택 전략과 이름에 반영한다', async () => {
    const generator = new DeterministicCourseCandidateGenerator()
    const questionnaire: NonNullable<
      CourseGenerationInputSnapshot['questionnaire']
    > = {
      questionnaireId: '30',
      questionnaireVersion: 1,
      schemaVersion: 1,
      promptVersion: 1,
      source: QuestionnaireSource.Llm,
      provider: 'openai',
      model: 'test-model',
      answers: [
        {
          questionCode: QuestionnaireDimensionCode.primaryPurpose,
          questionText: '목적',
          optionCode: QuestionnaireOptionCode.newExperience,
          optionLabel: '새로운 경험',
        },
        {
          questionCode: QuestionnaireDimensionCode.coursePace,
          questionText: '속도',
          optionCode: QuestionnaireOptionCode.efficient,
          optionLabel: '효율',
        },
        {
          questionCode: QuestionnaireDimensionCode.atmosphere,
          questionText: '분위기',
          optionCode: QuestionnaireOptionCode.cozy,
          optionLabel: '아늑함',
        },
      ],
    }

    const result = await generator.generate(createInput(questionnaire))

    expect(result.candidates[0]).toEqual({
      name: '아늑한 취향 코스',
      recommendationIds: ['102', '202'],
    })
    expect(result.candidates[1]).toEqual({
      name: '빠른 동선 코스',
      recommendationIds: ['101', '202'],
    })
    expect(result.candidates[2]).toEqual({
      name: '모두의 취향 코스',
      recommendationIds: ['101', '201'],
    })
  })

  describe('엣지 케이스: 좋아요/싫어요 반응이 전혀 없는 경우', () => {
    function createTiedInput(
      categorySteps: CourseGenerationRuntimeInput['categorySteps'],
      recommendations: CourseGenerationRuntimeInput['recommendations'],
    ): CourseGenerationRuntimeInput {
      return {
        schemaVersion: 1,
        meeting: {
          meetingId: '1',
          meetingTypeId: '2',
          meetingTypeCode: MeetingTypeCode.Social,
          date: '2026-08-22',
          time: '18:30:00',
          courseVersion: 1,
          location: { latitude: 37.5, longitude: 127 },
        },
        participantCount: 4,
        categorySteps,
        recommendations,
        questionnaire: null,
      }
    }

    function place(
      recommendationId: string,
      categorySlug: CategorySlug,
      placeCategoryId: string,
      longitude: number,
    ): CourseGenerationRuntimeInput['recommendations'][number] {
      return {
        recommendationId,
        placeId: `place-${recommendationId}`,
        placeCategoryId,
        categorySlug,
        name: `장소 ${recommendationId}`,
        address: `주소 ${recommendationId}`,
        latitude: 37.5,
        longitude,
        likeCount: 0,
        dislikeCount: 0,
      }
    }

    it('카페 2개·음식점 1개면 만들 수 있는 조합 2개를 모두 생성한다', async () => {
      const generator = new DeterministicCourseCandidateGenerator()
      const cafeNear = '301'
      const cafeFar = '302'
      const restaurant = '401'
      const input = createTiedInput(
        [
          { order: 1, categoryId: '20', categorySlug: CategorySlug.Cafe },
          {
            order: 2,
            categoryId: '10',
            categorySlug: CategorySlug.Restaurant,
          },
        ],
        [
          place(cafeNear, CategorySlug.Cafe, '20', 127.0005),
          place(cafeFar, CategorySlug.Cafe, '20', 127.002),
          place(restaurant, CategorySlug.Restaurant, '10', 127.003),
        ],
      )

      const result = await generator.generate(input)

      expect(result.candidates).toHaveLength(2)
      const combinations = result.candidates.map((candidate) =>
        [...candidate.recommendationIds].sort(),
      )
      expect(combinations).toContainEqual([cafeNear, restaurant])
      expect(combinations).toContainEqual([cafeFar, restaurant])
    })

    it('카페 3개·음식점 1개면 만들 수 있는 조합의 최대치인 3개를 모두 생성한다', async () => {
      const generator = new DeterministicCourseCandidateGenerator()
      const cafe1 = '301'
      const cafe2 = '302'
      const cafe3 = '303'
      const restaurant = '401'
      const input = createTiedInput(
        [
          { order: 1, categoryId: '20', categorySlug: CategorySlug.Cafe },
          {
            order: 2,
            categoryId: '10',
            categorySlug: CategorySlug.Restaurant,
          },
        ],
        [
          place(cafe1, CategorySlug.Cafe, '20', 127.0005),
          place(cafe2, CategorySlug.Cafe, '20', 127.0015),
          place(cafe3, CategorySlug.Cafe, '20', 127.0025),
          place(restaurant, CategorySlug.Restaurant, '10', 127.0035),
        ],
      )

      const result = await generator.generate(input)

      expect(result.candidates).toHaveLength(3)
      const combinations = result.candidates.map((candidate) =>
        [...candidate.recommendationIds].sort(),
      )
      expect(combinations).toContainEqual([cafe1, restaurant])
      expect(combinations).toContainEqual([cafe2, restaurant])
      expect(combinations).toContainEqual([cafe3, restaurant])
    })

    it('뒤쪽 단계(음식점)에서 동점이 나도 3개 조합을 모두 생성한다', async () => {
      const generator = new DeterministicCourseCandidateGenerator()
      const cafe = '301'
      const restaurant1 = '401'
      const restaurant2 = '402'
      const restaurant3 = '403'
      const input = createTiedInput(
        [
          { order: 1, categoryId: '20', categorySlug: CategorySlug.Cafe },
          {
            order: 2,
            categoryId: '10',
            categorySlug: CategorySlug.Restaurant,
          },
        ],
        [
          place(cafe, CategorySlug.Cafe, '20', 127.0005),
          place(restaurant1, CategorySlug.Restaurant, '10', 127.001),
          place(restaurant2, CategorySlug.Restaurant, '10', 127.002),
          place(restaurant3, CategorySlug.Restaurant, '10', 127.003),
        ],
      )

      const result = await generator.generate(input)

      expect(result.candidates).toHaveLength(3)
      for (const candidate of result.candidates) {
        expect(candidate.recommendationIds[0]).toBe(cafe)
      }
      const restaurantChoices = result.candidates.map(
        (candidate) => candidate.recommendationIds[1],
      )
      expect(new Set(restaurantChoices)).toEqual(
        new Set([restaurant1, restaurant2, restaurant3]),
      )
    })

    it('조합 자체가 1개뿐이면 억지로 늘리지 않고 1개만 생성한다', async () => {
      const generator = new DeterministicCourseCandidateGenerator()
      const cafe = '301'
      const restaurant = '401'
      const input = createTiedInput(
        [
          { order: 1, categoryId: '20', categorySlug: CategorySlug.Cafe },
          {
            order: 2,
            categoryId: '10',
            categorySlug: CategorySlug.Restaurant,
          },
        ],
        [
          place(cafe, CategorySlug.Cafe, '20', 127.0005),
          place(restaurant, CategorySlug.Restaurant, '10', 127.001),
        ],
      )

      const result = await generator.generate(input)

      expect(result.candidates).toHaveLength(1)
      expect(result.candidates[0].recommendationIds).toEqual([cafe, restaurant])
    })

    it('선호도가 실제로 갈리면(동점이 아니면) 순위 로테이션과 무관하게 항상 최선의 후보를 고른다', async () => {
      const generator = new DeterministicCourseCandidateGenerator()
      const cafeLiked = '301'
      const cafeUnliked = '302'
      const input = createTiedInput(
        [{ order: 1, categoryId: '20', categorySlug: CategorySlug.Cafe }],
        [
          {
            ...place(cafeLiked, CategorySlug.Cafe, '20', 127.002),
            likeCount: 5,
          },
          place(cafeUnliked, CategorySlug.Cafe, '20', 127.0005),
        ],
      )

      const result = await generator.generate(input)

      const preferenceCourse = result.candidates.find(
        (candidate) => candidate.name === '모두의 취향 코스',
      )
      const distanceCourse = result.candidates.find(
        (candidate) => candidate.name === '가까운 동선 코스',
      )

      expect(preferenceCourse?.recommendationIds).toEqual([cafeLiked])
      expect(distanceCourse?.recommendationIds).toEqual([cafeUnliked])
    })
  })
})
