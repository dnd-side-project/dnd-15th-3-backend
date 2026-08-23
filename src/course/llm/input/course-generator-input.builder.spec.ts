import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { KakaoWalkingDistanceService } from 'src/kakao/kakao-walking-distance.service'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import { QuestionnaireDimensionCode } from 'src/questionnaire/questionnaire.constants'
import { calculatePreferenceScore } from '../../course-preference-score'
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
  const walkingDistanceService = {
    getWalkingDistance: jest.fn().mockResolvedValue({
      distanceMeters: 100,
      travelTimeSeconds: 100,
      isEstimated: false,
    }),
  }
  const builder = new CourseGeneratorInputBuilder(
    walkingDistanceService as unknown as KakaoWalkingDistanceService,
  )

  return { builder, walkingDistanceService }
}

describe('CourseGeneratorInputBuilder', () => {
  it('카카오 도보 경로 조회가 실패해도(추정치로 대체되므로) AI 생성이 계속된다', async () => {
    const { builder, walkingDistanceService } = createBuilder()
    walkingDistanceService.getWalkingDistance.mockResolvedValue({
      distanceMeters: 400,
      travelTimeSeconds: 300,
      isEstimated: true,
    })

    const input = await builder.build(createRuntimeInput())

    expect(input.distanceMatrix.values.start['rec-1']).toBe(400)
  })

  it('추천 장소·투표·거리 데이터를 조합해 유효한 입력을 만든다', async () => {
    const { builder, walkingDistanceService } = createBuilder()
    walkingDistanceService.getWalkingDistance.mockResolvedValue({
      distanceMeters: 250,
      travelTimeSeconds: 200,
      isEstimated: false,
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

  it('추천의 좋아요·싫어요를 선호도 점수로 변환해 places에 담는다 (공식 자체는 calculatePreferenceScore에서 검증)', async () => {
    const { builder } = createBuilder()

    const input = await builder.build(
      createRuntimeInput({
        recommendations: [
          createRecommendation('rec-1', CategorySlug.Restaurant, {
            likeCount: 10,
            dislikeCount: 1,
          }),
        ],
      }),
    )

    expect(input.places[0].score).toBe(calculatePreferenceScore(10, 1))
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

  it('해당 카테고리 단계에 후보가 없으면 그 자리는 distanceMatrix 조회 대상에서 빠진다', async () => {
    const { builder, walkingDistanceService } = createBuilder()

    const input = await builder.build(
      createRuntimeInput({
        categorySteps: [
          {
            order: 1,
            categoryId: 'category-1',
            categorySlug: CategorySlug.Restaurant,
          },
        ],
        // 방문 단계는 restaurant인데 후보는 cafe뿐 -> 해당 단계 pool이 비게 됨
        recommendations: [createRecommendation('rec-1', CategorySlug.Cafe)],
      }),
    )

    expect(walkingDistanceService.getWalkingDistance).not.toHaveBeenCalled()
    expect(input.distanceMatrix.values).toEqual({})
  })
})
