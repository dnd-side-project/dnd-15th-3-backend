import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
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
  const participantRepository = { findOne: jest.fn() }
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
    [MeetingParticipant, participantRepository],
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
  const service = new CourseGenerationService(
    dataSource as never,
    courseRepository as never,
    voteRepository as never,
    questionnaireService as never,
  )

  return {
    service,
    manager,
    participantRepository,
    meetingRepository,
    categoryStepRepository,
    recommendationRepository,
    runRepository,
    answerRepository,
    courseRepository,
    voteRepository,
    questionnaireService,
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

  context.participantRepository.findOne.mockResolvedValue(participant)
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
  it('질문을 건너뛰면 생성 입력을 스냅샷으로 보존하고 코스 생성 상태로 전환한다', async () => {
    const context = createService()
    const { meeting } = arrangeGeneratableMeeting(context)

    await expect(
      context.service.generateCourse('10', ' host-token ', {
        customization: { type: CourseGenerationCustomizationType.Skip },
      }),
    ).resolves.toEqual({
      status: MeetingStatus.CourseGenerating,
      confirmedCourseCandidateId: null,
    })

    expect(context.runRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        runVersion: 1,
        status: CourseGenerationRunStatus.Pending,
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
    context.participantRepository.findOne.mockResolvedValue(participant)
    context.courseRepository.lockMeeting.mockResolvedValue(meeting)

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
  })
})
