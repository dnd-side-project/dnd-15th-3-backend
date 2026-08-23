import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { KakaoWalkingCourseService } from 'src/kakao/kakao-walking-course.service'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import { QuestionnaireDimensionCode } from 'src/questionnaire/questionnaire.constants'
import type { CourseGenerationRuntimeInput } from '../../schema/course-generation-input.schema'
import { CourseGeneratorInputBuilder } from './course-generator-input.builder'

type Recommendation = CourseGenerationRuntimeInput['recommendations'][number]

function createRecommendation(
  recommendationId: string,
  categorySlug: CategorySlug,
  overrides: Partial<Recommendation> = {},
): Recommendation {
  return {
    recommendationId,
    placeId: `place-${recommendationId}`,
    placeCategoryId: 'category-1',
    categorySlug,
    likeCount: 0,
    dislikeCount: 0,
    name: `place-${recommendationId}`,
    address: 'address',
    latitude: 37.5,
    longitude: 127.0,
    ...overrides,
  }
}

function createRuntimeInput(
  overrides: Partial<CourseGenerationRuntimeInput> = {},
): CourseGenerationRuntimeInput {
  return {
    schemaVersion: 1,
    meeting: {
      meetingId: 'meeting-1',
      meetingTypeId: 'meeting-type-1',
      meetingTypeCode: MeetingTypeCode.Social,
      date: '2026-08-22', // Saturday
      time: '18:00:00',
      courseVersion: 1,
      location: { latitude: 37.5, longitude: 127.0 },
    },
    participantCount: 2,
    categorySteps: [
      {
        order: 1,
        categoryId: 'category-1',
        categorySlug: CategorySlug.Restaurant,
      },
    ],
    recommendations: [createRecommendation('rec-1', CategorySlug.Restaurant)],
    questionnaire: null,
    ...overrides,
  }
}

function createBuilder() {
  const kakaoWalkingCourseService = {
    getWalkingCourse: jest.fn().mockResolvedValue({
      status: 'OK',
      route: { properties: { totalDistance: 100, totalTime: 100 }, legs: [] },
    }),
  }
  const builder = new CourseGeneratorInputBuilder(
    kakaoWalkingCourseService as unknown as KakaoWalkingCourseService,
  )

  return { builder, kakaoWalkingCourseService }
}

describe('CourseGeneratorInputBuilder', () => {
  it('카카오 API 호출이 실패(설정 오류·네트워크 오류 등)하면 그대로 전파한다', async () => {
    const { builder, kakaoWalkingCourseService } = createBuilder()
    kakaoWalkingCourseService.getWalkingCourse.mockRejectedValue(
      new Error('카카오 API 키가 설정되지 않았습니다'),
    )

    await expect(builder.build(createRuntimeInput())).rejects.toThrow(
      '카카오 API 키가 설정되지 않았습니다',
    )
  })

  it('추천 장소·투표·거리 데이터를 조합해 유효한 입력을 만든다', async () => {
    const { builder, kakaoWalkingCourseService } = createBuilder()
    kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue({
      status: 'OK',
      route: { properties: { totalDistance: 250, totalTime: 200 }, legs: [] },
    })

    const input = await builder.build(
      createRuntimeInput({
        categorySteps: [
          {
            order: 1,
            categoryId: 'category-1',
            categorySlug: CategorySlug.Restaurant,
          },
          {
            order: 2,
            categoryId: 'category-2',
            categorySlug: CategorySlug.Cafe,
          },
        ],
        recommendations: [
          createRecommendation('rec-1', CategorySlug.Restaurant, {
            likeCount: 3,
            dislikeCount: 1,
          }),
          createRecommendation('rec-2', CategorySlug.Cafe, {
            likeCount: 0,
            dislikeCount: 0,
          }),
        ],
      }),
    )

    expect(input.meetingType).toBe(MeetingTypeCode.Social)
    expect(input.isWeekend).toBe(true)
    expect(input.qna).toEqual([])
    expect(input.visitOrder).toEqual([
      CategorySlug.Restaurant,
      CategorySlug.Cafe,
    ])
    expect(input.places).toEqual([
      {
        id: 'rec-1',
        name: 'place-rec-1',
        category: CategorySlug.Restaurant,
        score: 1.5, // 3 - 1*1.5
        tags: [],
      },
      {
        id: 'rec-2',
        name: 'place-rec-2',
        category: CategorySlug.Cafe,
        score: 0,
        tags: [],
      },
    ])
    expect(input.distanceMatrix.values).toEqual({
      start: { 'rec-1': 250 },
      'rec-1': { 'rec-2': 250 },
    })
  })

  it('recommendationId를 장소 id로 사용한다 (결과를 recommendationId로 바로 되돌려받기 위함)', async () => {
    const { builder } = createBuilder()

    const input = await builder.build(
      createRuntimeInput({
        recommendations: [
          createRecommendation('rec-42', CategorySlug.Restaurant, {
            placeId: 'place-different-id',
          }),
        ],
      }),
    )

    expect(input.places[0].id).toBe('rec-42')
  })

  it('questionnaire 답변을 question/answer 텍스트 쌍으로 변환한다', async () => {
    const { builder } = createBuilder()

    const input = await builder.build(
      createRuntimeInput({
        questionnaire: {
          questionnaireId: 'q-1',
          questionnaireVersion: 1,
          schemaVersion: 1,
          promptVersion: 1,
          source: QuestionnaireSource.Llm,
          provider: 'openai',
          model: 'gpt-4o-mini',
          answers: [
            {
              questionCode: QuestionnaireDimensionCode.atmosphere,
              questionText: '분위기가 어떤가요?',
              optionCode: 'QUIET',
              optionLabel: '조용한 분위기',
            },
          ],
        },
      }),
    )

    expect(input.qna).toEqual([
      { question: '분위기가 어떤가요?', answer: '조용한 분위기' },
    ])
  })

  it('questionnaire가 없으면 qna는 빈 배열이다', async () => {
    const { builder } = createBuilder()

    const input = await builder.build(
      createRuntimeInput({ questionnaire: null }),
    )

    expect(input.qna).toEqual([])
  })

  describe('선호도 점수 계산', () => {
    it.each([
      [0, 0, 0],
      [5, 0, 5],
      [0, 5, -7.5],
      [10, 1, 8.5],
      [3, 2, 0],
      [1, 1, -0.5],
    ])(
      '좋아요 %i개, 싫어요 %i개면 점수는 %f이다',
      async (likeCount, dislikeCount, expectedScore) => {
        const { builder } = createBuilder()

        const input = await builder.build(
          createRuntimeInput({
            recommendations: [
              createRecommendation('rec-1', CategorySlug.Restaurant, {
                likeCount,
                dislikeCount,
              }),
            ],
          }),
        )

        expect(input.places[0].score).toBe(expectedScore)
      },
    )

    it('싫어요 1개는 좋아요 1개보다 더 크게 깎는다 (비대칭 가중치)', async () => {
      const { builder } = createBuilder()

      async function scoreFor(likeCount: number, dislikeCount: number) {
        const input = await builder.build(
          createRuntimeInput({
            recommendations: [
              createRecommendation('rec-1', CategorySlug.Restaurant, {
                likeCount,
                dislikeCount,
              }),
            ],
          }),
        )
        return input.places[0].score
      }

      const onlyLike = await scoreFor(1, 0)
      const onlyDislike = await scoreFor(0, 1)

      expect(Math.abs(onlyDislike)).toBeGreaterThan(Math.abs(onlyLike))
    })
  })

  describe('주말 판정', () => {
    it.each([
      ['2026-08-22', true], // Saturday
      ['2026-08-23', true], // Sunday
      ['2026-08-24', false], // Monday
      ['2026-08-28', false], // Friday
    ])('%s는 주말인가? -> %s', async (date, expected) => {
      const { builder } = createBuilder()

      const input = await builder.build(
        createRuntimeInput({
          meeting: {
            meetingId: 'meeting-1',
            meetingTypeId: 'meeting-type-1',
            meetingTypeCode: MeetingTypeCode.Social,
            date,
            time: '18:00:00',
            courseVersion: 1,
            location: { latitude: 37.5, longitude: 127.0 },
          },
        }),
      )

      expect(input.isWeekend).toBe(expected)
    })
  })

  it('카카오 API가 경로를 찾지 못한 쌍은 distanceMatrix에서 빠진다', async () => {
    const { builder, kakaoWalkingCourseService } = createBuilder()
    kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue({
      status: 'ROUTE_RESULT_NOT_FOUND',
    })

    const input = await builder.build(createRuntimeInput())

    expect(input.distanceMatrix.values).toEqual({})
  })
})
