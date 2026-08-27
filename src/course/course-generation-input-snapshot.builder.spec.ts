import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import { CourseGenerationInputSnapshotBuilder } from './course-generation-input-snapshot.builder'
import { CourseCategoryStep } from './entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from './entities/meeting-place-recommendation.entity'
import { CourseGenerationCustomizationType } from './enums/course-generation-customization-type.enum'
import { CourseException } from './exception/course.exception'

function createMeeting(): Meeting {
  return Object.assign(new Meeting(), {
    id: '10',
    date: '2026-08-22',
    time: '18:30:00',
    courseVersion: 1,
    meetingType: { id: '2', code: MeetingTypeCode.Social },
    meetingLocation: { latitude: 37.5446, longitude: 127.0557 },
  })
}

function createStep(): CourseCategoryStep {
  return Object.assign(new CourseCategoryStep(), {
    id: '30',
    order: 1,
    category: { id: '20', slug: CategorySlug.Cafe },
  })
}

function createRecommendation(
  overrides: Partial<MeetingPlaceRecommendation['place']> = {},
): MeetingPlaceRecommendation {
  return Object.assign(new MeetingPlaceRecommendation(), {
    id: '40',
    place: {
      id: '50',
      category: { id: '20', slug: CategorySlug.Cafe },
      name: '성수 카페',
      address: '서울 성동구',
      latitude: 37.545,
      longitude: 127.056,
      ...overrides,
    },
  })
}

function createBuilder() {
  const categoryStepRepository = { find: jest.fn() }
  const recommendationRepository = { find: jest.fn() }
  const repositories = new Map<unknown, unknown>([
    [CourseCategoryStep, categoryStepRepository],
    [MeetingPlaceRecommendation, recommendationRepository],
  ])
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  }
  const courseRepository = { countParticipants: jest.fn().mockResolvedValue(3) }
  const voteRepository = {
    getVoteCountsByRecommendation: jest
      .fn()
      .mockResolvedValue(new Map([['40', { likeCount: 2, dislikeCount: 1 }]])),
  }
  const questionnaireService = { resolveAnswers: jest.fn() }

  const builder = new CourseGenerationInputSnapshotBuilder(
    courseRepository as never,
    voteRepository as never,
    questionnaireService as never,
  )

  return {
    builder,
    manager,
    categoryStepRepository,
    recommendationRepository,
    courseRepository,
    voteRepository,
    questionnaireService,
  }
}

const skipRequest = {
  customization: { type: CourseGenerationCustomizationType.Skip as const },
}

describe('CourseGenerationInputSnapshotBuilder', () => {
  it('DB 데이터를 조합해 유효한 inputSnapshot을 만든다', async () => {
    const context = createBuilder()
    context.categoryStepRepository.find.mockResolvedValue([createStep()])
    context.recommendationRepository.find.mockResolvedValue([
      createRecommendation(),
    ])

    const result = await context.builder.build(
      context.manager as never,
      createMeeting(),
      skipRequest,
    )

    expect(result.inputSnapshot).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        participantCount: 3,
        questionnaire: null,
        categorySteps: [
          { order: 1, categoryId: '20', categorySlug: CategorySlug.Cafe },
        ],
        recommendations: [
          {
            recommendationId: '40',
            placeId: '50',
            placeCategoryId: '20',
            categorySlug: CategorySlug.Cafe,
            likeCount: 2,
            dislikeCount: 1,
            name: '성수 카페',
            address: '서울 성동구',
            latitude: 37.545,
            longitude: 127.056,
          },
        ],
      }),
    )
    expect(result.questionnaireResult).toBeNull()
  })

  it('카테고리 단계가 하나도 없으면 예외를 던진다', async () => {
    const context = createBuilder()
    context.categoryStepRepository.find.mockResolvedValue([])
    context.recommendationRepository.find.mockResolvedValue([])

    await expect(
      context.builder.build(
        context.manager as never,
        createMeeting(),
        skipRequest,
      ),
    ).rejects.toThrow(CourseException)
  })

  it('카테고리 단계 수만큼 추천 장소가 없으면 예외를 던진다', async () => {
    const context = createBuilder()
    context.categoryStepRepository.find.mockResolvedValue([
      createStep(),
      Object.assign(new CourseCategoryStep(), {
        id: '31',
        order: 2,
        category: { id: '20', slug: CategorySlug.Cafe },
      }),
    ])
    context.recommendationRepository.find.mockResolvedValue([
      createRecommendation(),
    ])

    await expect(
      context.builder.build(
        context.manager as never,
        createMeeting(),
        skipRequest,
      ),
    ).rejects.toThrow(CourseException)
  })

  it('카카오 출처 장소는 providerPlaceId가 없으면 예외를 던진다', async () => {
    const context = createBuilder()
    context.categoryStepRepository.find.mockResolvedValue([createStep()])
    context.recommendationRepository.find.mockResolvedValue([
      createRecommendation({
        source: PlaceSource.Kakao,
        providerPlaceId: null,
      }),
    ])

    await expect(
      context.builder.build(
        context.manager as never,
        createMeeting(),
        skipRequest,
      ),
    ).rejects.toThrow(CourseException)
  })

  it('카카오 출처 장소는 ID·URL만 스냅샷에 보존한다', async () => {
    const context = createBuilder()
    context.categoryStepRepository.find.mockResolvedValue([createStep()])
    context.recommendationRepository.find.mockResolvedValue([
      createRecommendation({
        source: PlaceSource.Kakao,
        providerPlaceId: '12345',
        placeUrl: 'https://place.map.kakao.com/12345',
        name: '12345',
        address: 'KAKAO_PLACE_REFERENCE',
        latitude: 0,
        longitude: 0,
      }),
    ])

    const result = await context.builder.build(
      context.manager as never,
      createMeeting(),
      skipRequest,
    )

    expect(result.inputSnapshot.recommendations).toEqual([
      {
        recommendationId: '40',
        placeId: '50',
        placeCategoryId: '20',
        categorySlug: CategorySlug.Cafe,
        likeCount: 2,
        dislikeCount: 1,
        source: PlaceSource.Kakao,
        providerPlaceId: '12345',
        placeUrl: 'https://place.map.kakao.com/12345',
      },
    ])
  })

  it('customization이 QUESTIONNAIRE면 questionnaireService.resolveAnswers를 호출한다', async () => {
    const context = createBuilder()
    context.categoryStepRepository.find.mockResolvedValue([createStep()])
    context.recommendationRepository.find.mockResolvedValue([
      createRecommendation(),
    ])
    const snapshot = {
      questionnaireId: '60',
      questionnaireVersion: 1,
      schemaVersion: 1,
      promptVersion: 1,
      source: 'LLM',
      provider: 'openai',
      model: 'test-model',
      answers: [
        {
          questionCode: 'PRIMARY_PURPOSE',
          questionText: '목적은?',
          optionCode: 'CONVERSATION',
          optionLabel: '대화',
        },
        {
          questionCode: 'COURSE_PACE',
          questionText: '속도는?',
          optionCode: 'RELAXED',
          optionLabel: '여유',
        },
        {
          questionCode: 'ATMOSPHERE',
          questionText: '분위기는?',
          optionCode: 'COZY',
          optionLabel: '아늑함',
        },
      ],
    }
    context.questionnaireService.resolveAnswers.mockResolvedValue({
      questionnaire: { id: '60' },
      answers: [],
      snapshot,
    })

    const result = await context.builder.build(
      context.manager as never,
      createMeeting(),
      {
        customization: {
          type: CourseGenerationCustomizationType.Questionnaire,
          questionnaireId: '60',
          questionnaireVersion: 1,
          answers: [],
        },
      } as never,
    )

    expect(context.questionnaireService.resolveAnswers).toHaveBeenCalledWith(
      context.manager,
      '10',
      '60',
      1,
      [],
    )
    expect(result.inputSnapshot.questionnaire).toEqual(snapshot)
    expect(result.questionnaireResult).not.toBeNull()
  })
})
