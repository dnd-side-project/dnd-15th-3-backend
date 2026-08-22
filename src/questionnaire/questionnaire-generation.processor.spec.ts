import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingType } from 'src/meeting/entities/meeting-type.entity'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { MeetingQuestion } from './entities/meeting-question.entity'
import { MeetingQuestionOption } from './entities/meeting-question-option.entity'
import { MeetingQuestionnaire } from './entities/meeting-questionnaire.entity'
import { QuestionnaireGenerationStatus } from './enums/questionnaire-generation-status.enum'
import { QuestionnaireSource } from './enums/questionnaire-source.enum'
import { FallbackQuestionnaireGenerator } from './provider/fallback-questionnaire.generator'
import { QuestionnaireDimensionCode } from './questionnaire.constants'
import { QuestionnaireGenerationProcessor } from './questionnaire-generation.processor'

describe('QuestionnaireGenerationProcessor', () => {
  it('기존 첫 질문을 보존하고 생성된 후속 질문을 2·3번으로 저장한다', async () => {
    const meeting = Object.assign(new Meeting(), {
      id: '10',
      name: '성수 나들이',
      date: '2026-08-22',
      time: '18:30:00',
      meetingType: Object.assign(new MeetingType(), {
        code: MeetingTypeCode.Social,
        name: '친목',
      }),
    })
    const questionnaire = Object.assign(new MeetingQuestionnaire(), {
      id: '60',
      meeting,
      generationStatus: QuestionnaireGenerationStatus.Generating,
      generationAttemptCount: 1,
    })
    const fallback = await new FallbackQuestionnaireGenerator().generate({
      meetingName: meeting.name,
      meetingTypeCode: MeetingTypeCode.Social,
      meetingTypeName: '친목',
      schedule: {
        date: meeting.date,
        time: meeting.time,
        dayOfWeek: '토요일',
        dayType: '주말',
        timePeriod: '저녁',
      },
      courseCategories: [
        { order: 1, slug: CategorySlug.Restaurant, name: '음식점' },
        { order: 2, slug: CategorySlug.Cafe, name: '카페' },
      ],
      recommendedPlaceCategories: [
        { slug: CategorySlug.Restaurant, name: '음식점', count: 2 },
      ],
    })
    const generator = {
      generate: jest.fn().mockResolvedValue({
        ...fallback,
        questions: [...fallback.questions].reverse(),
      }),
    }

    const questionnaireLockBuilder = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(questionnaire),
    }
    const questionnaireRepository = {
      findOne: jest.fn().mockResolvedValue(questionnaire),
      createQueryBuilder: jest.fn().mockReturnValue(questionnaireLockBuilder),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    }
    const questionDeleteBuilder = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    }
    const savedQuestions: MeetingQuestion[] = []
    const questionRepository = {
      exists: jest.fn().mockResolvedValue(true),
      createQueryBuilder: jest.fn().mockReturnValue(questionDeleteBuilder),
      create: jest.fn((value) => Object.assign(new MeetingQuestion(), value)),
      save: jest.fn((question: MeetingQuestion) => {
        question.id = String(100 + question.order)
        savedQuestions.push(question)
        return question
      }),
    }
    const optionRepository = {
      create: jest.fn((value) =>
        Object.assign(new MeetingQuestionOption(), value),
      ),
      save: jest.fn(async (values) => values),
    }
    const categoryStepRepository = {
      find: jest.fn().mockResolvedValue([
        {
          order: 1,
          category: { slug: CategorySlug.Restaurant, name: '음식점' },
        },
        {
          order: 2,
          category: { slug: CategorySlug.Cafe, name: '카페' },
        },
      ]),
    }
    const recommendationRepository = {
      find: jest.fn().mockResolvedValue([
        {
          place: {
            category: { slug: CategorySlug.Restaurant, name: '음식점' },
          },
        },
        {
          place: {
            category: { slug: CategorySlug.Restaurant, name: '음식점' },
          },
        },
      ]),
    }
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === MeetingQuestionnaire) return questionnaireRepository
        if (entity === MeetingQuestion) return questionRepository
        if (entity === MeetingQuestionOption) return optionRepository
        throw new Error('unexpected repository')
      }),
    }
    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === MeetingQuestionnaire) return questionnaireRepository
        if (entity === CourseCategoryStep) return categoryStepRepository
        if (entity === MeetingPlaceRecommendation)
          return recommendationRepository
        throw new Error('unexpected repository')
      }),
      transaction: jest.fn((callback) => callback(manager)),
    }
    const processor = new QuestionnaireGenerationProcessor(
      dataSource as never,
      generator as never,
    )

    await processor.processQuestionnaire('60', 1)

    expect(savedQuestions.map((question) => question.order)).toEqual([2, 3])
    expect(savedQuestions.map((question) => question.dimensionCode)).toEqual([
      QuestionnaireDimensionCode.coursePace,
      QuestionnaireDimensionCode.atmosphere,
    ])
    expect(questionDeleteBuilder.andWhere).toHaveBeenCalledWith('"order" > 1')
    expect(generator.generate).toHaveBeenCalledWith({
      meetingName: '성수 나들이',
      meetingTypeCode: MeetingTypeCode.Social,
      meetingTypeName: '친목',
      schedule: {
        date: '2026-08-22',
        time: '18:30:00',
        dayOfWeek: '토요일',
        dayType: '주말',
        timePeriod: '저녁',
      },
      courseCategories: [
        { order: 1, slug: CategorySlug.Restaurant, name: '음식점' },
        { order: 2, slug: CategorySlug.Cafe, name: '카페' },
      ],
      recommendedPlaceCategories: [
        { slug: CategorySlug.Restaurant, name: '음식점', count: 2 },
      ],
    })
    expect(questionnaireRepository.update).toHaveBeenCalledWith(
      '60',
      expect.objectContaining({
        generationStatus: QuestionnaireGenerationStatus.Ready,
        source: QuestionnaireSource.Fallback,
        provider: 'internal',
        model: 'fallback-v1',
        generationError: null,
        generatedAt: expect.any(Function),
      }),
    )
    const update = questionnaireRepository.update.mock.calls[0][1]
    expect(update.generatedAt()).toBe('CURRENT_TIMESTAMP')
  })

  it('이미 다른 워커가 재선점한 generation attempt는 처리하지 않는다', async () => {
    const questionnaire = Object.assign(new MeetingQuestionnaire(), {
      id: '60',
      generationStatus: QuestionnaireGenerationStatus.Generating,
      generationAttemptCount: 2,
    })
    const questionnaireRepository = {
      findOne: jest.fn().mockResolvedValue(questionnaire),
    }
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(questionnaireRepository),
    }
    const generator = { generate: jest.fn() }
    const processor = new QuestionnaireGenerationProcessor(
      dataSource as never,
      generator as never,
    )

    await processor.processQuestionnaire('60', 1)

    expect(generator.generate).not.toHaveBeenCalled()
  })
})
