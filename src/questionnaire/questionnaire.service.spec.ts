import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { MeetingQuestion } from './entities/meeting-question.entity'
import { MeetingQuestionOption } from './entities/meeting-question-option.entity'
import { MeetingQuestionnaire } from './entities/meeting-questionnaire.entity'
import { QuestionnaireGenerationStatus } from './enums/questionnaire-generation-status.enum'
import { QuestionnaireSource } from './enums/questionnaire-source.enum'
import { QuestionnaireException } from './exception/questionnaire.exception'
import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from './questionnaire.constants'
import { QuestionnaireService } from './questionnaire.service'
import { FIRST_QUESTION_TEMPLATE } from './questionnaire.templates'

function createReadyQuestionnaire() {
  const dimensions = [
    QuestionnaireDimensionCode.primaryPurpose,
    QuestionnaireDimensionCode.coursePace,
    QuestionnaireDimensionCode.atmosphere,
  ]
  const optionCodes = [
    QuestionnaireOptionCode.conversation,
    QuestionnaireOptionCode.relaxed,
    QuestionnaireOptionCode.cozy,
  ]
  const questions = dimensions.map((dimensionCode, index) => {
    const question = Object.assign(new MeetingQuestion(), {
      id: String(101 + index),
      order: index + 1,
      dimensionCode,
      text: `질문 ${index + 1}`,
    })
    const option = Object.assign(new MeetingQuestionOption(), {
      id: String(1001 + index),
      order: 1,
      semanticCode: optionCodes[index],
      label: `답변 ${index + 1}`,
      question,
    })
    question.options = [option]
    return question
  })
  return Object.assign(new MeetingQuestionnaire(), {
    id: '60',
    version: 1,
    schemaVersion: 1,
    promptVersion: 1,
    generationStatus: QuestionnaireGenerationStatus.Ready,
    source: QuestionnaireSource.Llm,
    provider: 'openai',
    model: 'test-model',
    questions,
  })
}

function createService(questionnaire: MeetingQuestionnaire | null) {
  const questionnaireRepository = {
    findOne: jest.fn().mockResolvedValue(questionnaire),
  }
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === MeetingQuestionnaire) return questionnaireRepository
      throw new Error('unexpected repository')
    }),
  }
  return {
    service: new QuestionnaireService({} as never, {} as never),
    manager,
    questionnaireRepository,
  }
}

describe('QuestionnaireService.resolveAnswers', () => {
  it('질문 순서대로 불변 코스 생성 스냅샷을 만든다', async () => {
    const questionnaire = createReadyQuestionnaire()
    const { service, manager } = createService(questionnaire)
    const submittedAnswers = [...questionnaire.questions]
      .reverse()
      .map((question) => ({
        questionId: question.id,
        optionId: question.options[0].id,
      }))

    const result = await service.resolveAnswers(
      manager as never,
      '10',
      '60',
      1,
      submittedAnswers,
    )

    expect(result.answers.map((answer) => answer.question.id)).toEqual([
      '101',
      '102',
      '103',
    ])
    expect(result.snapshot).toEqual({
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
          questionText: '질문 1',
          optionCode: QuestionnaireOptionCode.conversation,
          optionLabel: '답변 1',
        },
        {
          questionCode: QuestionnaireDimensionCode.coursePace,
          questionText: '질문 2',
          optionCode: QuestionnaireOptionCode.relaxed,
          optionLabel: '답변 2',
        },
        {
          questionCode: QuestionnaireDimensionCode.atmosphere,
          questionText: '질문 3',
          optionCode: QuestionnaireOptionCode.cozy,
          optionLabel: '답변 3',
        },
      ],
    })
  })

  it('동일한 질문에 두 번 답하면 거부한다', async () => {
    const questionnaire = createReadyQuestionnaire()
    const { service, manager } = createService(questionnaire)

    const promise = service.resolveAnswers(manager as never, '10', '60', 1, [
      { questionId: '101', optionId: '1001' },
      { questionId: '101', optionId: '1001' },
      { questionId: '103', optionId: '1003' },
    ])

    await expect(promise).rejects.toBeInstanceOf(QuestionnaireException)
  })

  it('다른 모임이나 없는 질문 세트는 거부한다', async () => {
    const { service, manager, questionnaireRepository } = createService(null)

    await expect(
      service.resolveAnswers(manager as never, '10', '999', 1, []),
    ).rejects.toBeInstanceOf(QuestionnaireException)
    expect(questionnaireRepository.findOne).toHaveBeenCalledWith({
      where: { id: '999', meeting: { id: '10' } },
      relations: { questions: { options: true } },
    })
  })
})

describe('QuestionnaireService.createQuestionnaire', () => {
  it('LLM을 기다리지 않고 고정 첫 질문만 담긴 GENERATING 응답을 반환한다', async () => {
    const questionnaire = Object.assign(new MeetingQuestionnaire(), {
      id: '60',
      version: 1,
      schemaVersion: 1,
      promptVersion: 2,
      generationStatus: QuestionnaireGenerationStatus.Generating,
      source: null,
      provider: 'pending',
      model: 'pending',
      generationError: null,
      generationAttemptCount: 0,
      generationStartedAt: null,
      generatedAt: null,
      questions: [] as MeetingQuestion[],
    })
    const questionnaireRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(questionnaire),
      create: jest.fn((value) => Object.assign(questionnaire, value)),
      save: jest.fn(async (value) => value),
    }
    const questionRepository = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((value) => Object.assign(new MeetingQuestion(), value)),
      save: jest.fn((question: MeetingQuestion) => {
        question.id = '101'
        question.options = []
        questionnaire.questions = [question]
        return question
      }),
    }
    const optionRepository = {
      create: jest.fn((value) =>
        Object.assign(new MeetingQuestionOption(), value),
      ),
      save: jest.fn((options: MeetingQuestionOption[]) => {
        options.forEach((option, index) => {
          option.id = String(1001 + index)
        })
        questionnaire.questions[0].options = options
        return options
      }),
    }
    const meetingQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(
        Object.assign(new Meeting(), {
          id: '10',
          status: MeetingStatus.RecommendationCollecting,
        }),
      ),
    }
    const meetingRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(meetingQueryBuilder),
    }
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Meeting) return meetingRepository
        if (entity === MeetingQuestionnaire) return questionnaireRepository
        if (entity === MeetingQuestion) return questionRepository
        if (entity === MeetingQuestionOption) return optionRepository
        throw new Error('unexpected repository')
      }),
    }
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === MeetingQuestionnaire) return questionnaireRepository
        throw new Error('unexpected repository')
      }),
    }
    const meetingAccessService = {
      findParticipant: jest.fn().mockResolvedValue(
        Object.assign(new MeetingParticipant(), {
          role: ParticipantRole.Host,
        }),
      ),
    }
    const service = new QuestionnaireService(
      dataSource as never,
      meetingAccessService as never,
    )

    await expect(
      service.createQuestionnaire('10', 'host-token'),
    ).resolves.toEqual({
      status: QuestionnaireGenerationStatus.Generating,
      questionnaireId: '60',
      version: 1,
      totalCount: 3,
      availableCount: 1,
      questions: [
        expect.objectContaining({
          questionId: '101',
          order: 1,
          text: FIRST_QUESTION_TEMPLATE.text,
          options: expect.arrayContaining([
            expect.objectContaining({
              order: 1,
              label: FIRST_QUESTION_TEMPLATE.options[0].label,
            }),
          ]),
        }),
      ],
    })
    expect(questionnaireRepository.save).toHaveBeenCalledTimes(1)
    expect(questionRepository.save).toHaveBeenCalledTimes(1)
    expect(optionRepository.save).toHaveBeenCalledTimes(1)
    expect(meetingAccessService.findParticipant).toHaveBeenCalledWith(
      '10',
      'host-token',
      manager,
    )
  })
})
