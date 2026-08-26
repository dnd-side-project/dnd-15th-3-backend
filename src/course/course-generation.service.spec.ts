import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from 'src/questionnaire/questionnaire.constants'
import { CourseGenerationService } from './course-generation.service'
import { CourseCategoryStep } from './entities/course-category-step.entity'
import { CourseGenerationQuestionnaireAnswer } from './entities/course-generation-questionnaire-answer.entity'
import { CourseGenerationRun } from './entities/course-generation-run.entity'
import { MeetingPlaceRecommendation } from './entities/meeting-place-recommendation.entity'
import { CourseGenerationCustomizationType } from './enums/course-generation-customization-type.enum'
import { CourseGenerationRunStatus } from './enums/course-generation-run-status.enum'

function createService() {
  const meetingRepository = {
    exists: jest.fn(),
    save: jest.fn().mockImplementation((value) => value),
  }
  const categoryStepRepository = { find: jest.fn() }
  const recommendationRepository = { find: jest.fn() }
  const runRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((value) => value),
    save: jest.fn().mockImplementation((value) => {
      if (!value.id) value.id = '70'
      return value
    }),
  }
  const answerRepository = {
    create: jest.fn().mockImplementation((value) => value),
    save: jest.fn().mockImplementation((value) => value),
  }
  const repositories = new Map<unknown, unknown>([
    [Meeting, meetingRepository],
    [CourseCategoryStep, categoryStepRepository],
    [MeetingPlaceRecommendation, recommendationRepository],
    [CourseGenerationRun, runRepository],
    [CourseGenerationQuestionnaireAnswer, answerRepository],
  ])
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  }
  const dataSource = {
    transaction: jest.fn((callback: (value: unknown) => unknown) =>
      callback(manager),
    ),
  }
  const courseRepository = {
    lockMeeting: jest.fn(),
    countParticipants: jest.fn(),
  }
  const voteRepository = {
    getVoteCountsByRecommendation: jest.fn(),
  }
  const questionnaireService = { resolveAnswers: jest.fn() }
  const processor = {
    processRun: jest.fn().mockResolvedValue(MeetingStatus.CourseGenerated),
  }
  const meetingAccessService = { findParticipant: jest.fn() }
  const service = new CourseGenerationService(
    dataSource as never,
    courseRepository as never,
    voteRepository as never,
    questionnaireService as never,
    processor as never,
    meetingAccessService as never,
  )

  return {
    service,
    manager,
    meetingRepository,
    categoryStepRepository,
    recommendationRepository,
    runRepository,
    answerRepository,
    courseRepository,
    voteRepository,
    questionnaireService,
    processor,
    meetingAccessService,
  }
}

function arrangeGeneratableMeeting(context: ReturnType<typeof createService>) {
  const participant = Object.assign(new MeetingParticipant(), {
    id: '11',
    role: ParticipantRole.Host,
  })
  const meeting = Object.assign(new Meeting(), {
    id: '10',
    name: '성수 나들이',
    status: MeetingStatus.RecommendationCollecting,
    date: '2026-08-22',
    time: '18:30:00',
    courseVersion: 1,
    meetingType: { id: '2', code: MeetingTypeCode.Social },
    meetingLocation: { latitude: 37.5446, longitude: 127.0557 },
  })
  const category = { id: '20', slug: CategorySlug.Cafe }
  const step = Object.assign(new CourseCategoryStep(), {
    id: '30',
    order: 1,
    category,
  })
  const recommendation = Object.assign(new MeetingPlaceRecommendation(), {
    id: '40',
    place: {
      id: '50',
      category,
      name: '성수 카페',
      address: '서울 성동구',
      latitude: 37.545,
      longitude: 127.056,
    },
  })

  context.meetingAccessService.findParticipant.mockResolvedValue(participant)
  context.courseRepository.lockMeeting.mockResolvedValue(meeting)
  context.categoryStepRepository.find.mockResolvedValue([step])
  context.recommendationRepository.find.mockResolvedValue([recommendation])
  context.courseRepository.countParticipants.mockResolvedValue(3)
  context.voteRepository.getVoteCountsByRecommendation.mockResolvedValue(
    new Map([['40', { likeCount: 2, dislikeCount: 1 }]]),
  )
  context.runRepository.findOne.mockResolvedValue(null)

  return { participant, meeting }
}

describe('CourseGenerationService', () => {
  it('질문을 건너뛰면 입력을 보존하고 같은 요청에서 코스 생성을 완료한다', async () => {
    const context = createService()
    const { meeting } = arrangeGeneratableMeeting(context)

    await expect(
      context.service.generateCourse('10', ' host-token ', {
        customization: { type: CourseGenerationCustomizationType.Skip },
      }),
    ).resolves.toEqual({
      status: MeetingStatus.CourseGenerated,
      confirmedCourseCandidateId: null,
    })

    expect(context.runRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        runVersion: 1,
        status: CourseGenerationRunStatus.Processing,
        attemptCount: 1,
        startedAt: expect.any(Date),
        customizationType: CourseGenerationCustomizationType.Skip,
        inputSnapshot: expect.objectContaining({
          schemaVersion: 1,
          participantCount: 3,
          questionnaire: null,
          recommendations: [
            expect.objectContaining({
              recommendationId: '40',
              likeCount: 2,
              dislikeCount: 1,
            }),
          ],
        }),
        inputHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    )
    expect(context.questionnaireService.resolveAnswers).not.toHaveBeenCalled()
    expect(context.answerRepository.save).not.toHaveBeenCalled()
    expect(meeting.status).toBe(MeetingStatus.CourseGenerating)
    expect(context.meetingRepository.save).toHaveBeenCalledWith(meeting)
    expect(context.processor.processRun).toHaveBeenCalledWith('70')
  })

  it('Kakao 장소는 생성 스냅샷에 ID와 URL만 보존한다', async () => {
    const context = createService()
    arrangeGeneratableMeeting(context)
    const category = { id: '20', slug: CategorySlug.Cafe }
    context.recommendationRepository.find.mockResolvedValue([
      Object.assign(new MeetingPlaceRecommendation(), {
        id: '40',
        place: {
          id: '50',
          category,
          source: PlaceSource.Kakao,
          providerPlaceId: '12345',
          placeUrl: 'https://place.map.kakao.com/12345',
          name: '12345',
          address: 'KAKAO_PLACE_REFERENCE',
          latitude: 0,
          longitude: 0,
        },
      }),
    ])

    await context.service.generateCourse('10', 'host-token', {
      customization: { type: CourseGenerationCustomizationType.Skip },
    })

    const createdRun = context.runRepository.create.mock.calls[0][0]
    expect(createdRun.inputSnapshot.recommendations).toEqual([
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

  it('최종 응답 제출과 생성 run·답변 row 저장을 같은 트랜잭션에서 처리한다', async () => {
    const context = createService()
    arrangeGeneratableMeeting(context)
    const answers = [
      {
        question: { id: '101' },
        option: { id: '1001' },
      },
      {
        question: { id: '102' },
        option: { id: '1002' },
      },
      {
        question: { id: '103' },
        option: { id: '1003' },
      },
    ]
    const snapshot = {
      questionnaireId: '60',
      questionnaireVersion: 1,
      schemaVersion: 1,
      promptVersion: 1,
      source: QuestionnaireSource.Llm,
      provider: 'openai',
      model: 'test-model',
      answers: [
        {
          questionCode: QuestionnaireDimensionCode.primaryPurpose,
          questionText: '목적은?',
          optionCode: QuestionnaireOptionCode.conversation,
          optionLabel: '대화',
        },
        {
          questionCode: QuestionnaireDimensionCode.coursePace,
          questionText: '속도는?',
          optionCode: QuestionnaireOptionCode.relaxed,
          optionLabel: '여유',
        },
        {
          questionCode: QuestionnaireDimensionCode.atmosphere,
          questionText: '분위기는?',
          optionCode: QuestionnaireOptionCode.cozy,
          optionLabel: '아늑함',
        },
      ],
    }
    context.questionnaireService.resolveAnswers.mockResolvedValue({
      questionnaire: { id: '60' },
      answers,
      snapshot,
    })
    const request = {
      customization: {
        type: CourseGenerationCustomizationType.Questionnaire,
        questionnaireId: '60',
        questionnaireVersion: 1,
        answers: [
          { questionId: '101', optionId: '1001' },
          { questionId: '102', optionId: '1002' },
          { questionId: '103', optionId: '1003' },
        ],
      },
    }

    await context.service.generateCourse('10', 'host-token', request)

    expect(context.questionnaireService.resolveAnswers).toHaveBeenCalledWith(
      context.manager,
      '10',
      '60',
      1,
      request.customization.answers,
    )
    expect(context.runRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        questionnaire: { id: '60' },
        customizationType: CourseGenerationCustomizationType.Questionnaire,
        inputSnapshot: expect.objectContaining({ questionnaire: snapshot }),
      }),
    )
    expect(context.answerRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        generationRun: expect.objectContaining({ id: '70' }),
        question: answers[0].question,
        option: answers[0].option,
      }),
      expect.objectContaining({ question: answers[1].question }),
      expect.objectContaining({ question: answers[2].question }),
    ])
  })

  it('이미 생성 중인 모임의 재요청은 새 답변으로 덮어쓰지 않는다', async () => {
    const context = createService()
    const participant = Object.assign(new MeetingParticipant(), {
      role: ParticipantRole.Host,
    })
    const meeting = Object.assign(new Meeting(), {
      status: MeetingStatus.CourseGenerating,
    })
    const run = Object.assign(new CourseGenerationRun(), {
      status: CourseGenerationRunStatus.Processing,
      startedAt: new Date(),
    })
    context.meetingAccessService.findParticipant.mockResolvedValue(participant)
    context.courseRepository.lockMeeting.mockResolvedValue(meeting)
    context.runRepository.findOne.mockResolvedValue(run)

    await expect(
      context.service.generateCourse('10', 'host-token', {
        customization: { type: CourseGenerationCustomizationType.Skip },
      }),
    ).resolves.toEqual({
      status: MeetingStatus.CourseGenerating,
      confirmedCourseCandidateId: null,
    })

    expect(context.runRepository.save).not.toHaveBeenCalled()
    expect(context.questionnaireService.resolveAnswers).not.toHaveBeenCalled()
    expect(context.meetingRepository.save).not.toHaveBeenCalled()
    expect(context.processor.processRun).not.toHaveBeenCalled()
  })

  it('중단된 동기 생성 run은 재요청에서 즉시 재개한다', async () => {
    const context = createService()
    const participant = Object.assign(new MeetingParticipant(), {
      role: ParticipantRole.Host,
    })
    const meeting = Object.assign(new Meeting(), {
      id: '10',
      status: MeetingStatus.CourseGenerating,
    })
    const run = Object.assign(new CourseGenerationRun(), {
      id: '70',
      status: CourseGenerationRunStatus.Processing,
      attemptCount: 2,
      startedAt: new Date(Date.now() - 6 * 60 * 1000),
    })
    context.meetingAccessService.findParticipant.mockResolvedValue(participant)
    context.courseRepository.lockMeeting.mockResolvedValue(meeting)
    context.runRepository.findOne.mockResolvedValue(run)

    await expect(
      context.service.generateCourse('10', 'host-token', {
        customization: { type: CourseGenerationCustomizationType.Skip },
      }),
    ).resolves.toEqual({
      status: MeetingStatus.CourseGenerated,
      confirmedCourseCandidateId: null,
    })

    expect(run.status).toBe(CourseGenerationRunStatus.Processing)
    expect(run.attemptCount).toBe(3)
    expect(context.runRepository.save).toHaveBeenCalledWith(run)
    expect(context.processor.processRun).toHaveBeenCalledWith('70')
  })

  it('동기 코스 생성 실패 상태를 같은 응답으로 반환한다', async () => {
    const context = createService()
    arrangeGeneratableMeeting(context)
    context.processor.processRun.mockResolvedValue(
      MeetingStatus.CourseGenerationFailed,
    )

    await expect(
      context.service.generateCourse('10', 'host-token', {
        customization: { type: CourseGenerationCustomizationType.Skip },
      }),
    ).resolves.toEqual({
      status: MeetingStatus.CourseGenerationFailed,
      confirmedCourseCandidateId: null,
    })
  })

  it('실패한 run을 PROCESSING으로 전환해 같은 요청에서 재시도한다', async () => {
    const context = createService()
    const participant = Object.assign(new MeetingParticipant(), {
      id: '11',
      role: ParticipantRole.Host,
    })
    const meeting = Object.assign(new Meeting(), {
      id: '10',
      status: MeetingStatus.CourseGenerationFailed,
    })
    const run = Object.assign(new CourseGenerationRun(), {
      id: '70',
      status: CourseGenerationRunStatus.Failed,
      attemptCount: 2,
      errorMessage: 'route failed',
      outputSnapshot: null,
      startedAt: new Date('2026-08-22T00:00:00Z'),
      completedAt: new Date('2026-08-22T00:01:00Z'),
    })
    context.meetingAccessService.findParticipant.mockResolvedValue(participant)
    context.courseRepository.lockMeeting.mockResolvedValue(meeting)
    context.runRepository.findOne.mockResolvedValue(run)

    await expect(
      context.service.generateCourse('10', 'host-token', {
        customization: { type: CourseGenerationCustomizationType.Skip },
      }),
    ).resolves.toEqual({
      status: MeetingStatus.CourseGenerated,
      confirmedCourseCandidateId: null,
    })

    expect(run).toEqual(
      expect.objectContaining({
        requestedBy: participant,
        status: CourseGenerationRunStatus.Processing,
        attemptCount: 3,
        errorMessage: null,
        completedAt: null,
        startedAt: expect.any(Date),
      }),
    )
    expect(context.runRepository.save).toHaveBeenCalledWith(run)
    expect(context.processor.processRun).toHaveBeenCalledWith('70')
  })
})
