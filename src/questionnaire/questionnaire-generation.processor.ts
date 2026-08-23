import { Inject, Injectable, Logger } from '@nestjs/common'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { DataSource } from 'typeorm'
import { MeetingQuestion } from './entities/meeting-question.entity'
import { MeetingQuestionOption } from './entities/meeting-question-option.entity'
import { MeetingQuestionnaire } from './entities/meeting-questionnaire.entity'
import { QuestionnaireGenerationStatus } from './enums/questionnaire-generation-status.enum'
import type {
  QuestionnaireGenerationContext,
  QuestionnaireGenerator,
} from './provider/questionnaire-generator'
import {
  QUESTIONNAIRE_FOLLOW_UP_DIMENSION_CODES,
  type QuestionnaireDimensionCode,
} from './questionnaire.constants'
import { QUESTIONNAIRE_GENERATOR } from './questionnaire.tokens'

const DAY_OF_WEEK_NAMES = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
] as const

function createScheduleContext(
  date: string,
  time: string,
): QuestionnaireGenerationContext['schedule'] {
  const [year, month, day] = date.split('-').map(Number)
  const dayOfWeekIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const hour = Number(time.split(':')[0])
  const timePeriod =
    hour < 5
      ? '새벽'
      : hour < 12
        ? '오전'
        : hour < 17
          ? '오후'
          : hour < 21
            ? '저녁'
            : '밤'

  return {
    date,
    time,
    dayOfWeek: DAY_OF_WEEK_NAMES[dayOfWeekIndex],
    dayType: dayOfWeekIndex === 0 || dayOfWeekIndex === 6 ? '주말' : '평일',
    timePeriod,
  }
}

@Injectable()
export class QuestionnaireGenerationProcessor {
  private readonly logger = new Logger(QuestionnaireGenerationProcessor.name)

  constructor(
    private readonly dataSource: DataSource,
    @Inject(QUESTIONNAIRE_GENERATOR)
    private readonly generator: QuestionnaireGenerator,
  ) {}

  async processQuestionnaire(
    questionnaireId: string,
    generationAttempt: number,
  ): Promise<void> {
    try {
      const questionnaire = await this.dataSource
        .getRepository(MeetingQuestionnaire)
        .findOne({
          where: { id: questionnaireId },
          relations: { meeting: { meetingType: true } },
        })
      if (
        !questionnaire ||
        questionnaire.generationStatus !==
          QuestionnaireGenerationStatus.Generating ||
        questionnaire.generationAttemptCount !== generationAttempt
      ) {
        return
      }

      const context = await this.createGenerationContext(questionnaire)
      const generated = await this.generator.generate(context)
      const dimensionOrder = new Map<QuestionnaireDimensionCode, number>(
        QUESTIONNAIRE_FOLLOW_UP_DIMENSION_CODES.map((dimension, index) => [
          dimension,
          index,
        ]),
      )
      const followUpQuestions = [...generated.questions].sort(
        (left, right) =>
          (dimensionOrder.get(left.dimensionCode) ?? 0) -
          (dimensionOrder.get(right.dimensionCode) ?? 0),
      )

      await this.dataSource.transaction(async (manager) => {
        const questionnaireRepository =
          manager.getRepository(MeetingQuestionnaire)
        const current = await questionnaireRepository
          .createQueryBuilder('questionnaire')
          .where('questionnaire.id = :questionnaireId', { questionnaireId })
          .setLock('pessimistic_write')
          .getOne()
        if (
          !current ||
          current.generationStatus !==
            QuestionnaireGenerationStatus.Generating ||
          current.generationAttemptCount !== generationAttempt
        ) {
          return
        }

        const firstQuestionExists = await manager
          .getRepository(MeetingQuestion)
          .exists({
            where: { questionnaire: { id: current.id }, order: 1 },
          })
        if (!firstQuestionExists) {
          throw new Error('고정 첫 질문을 찾을 수 없습니다.')
        }

        await manager
          .getRepository(MeetingQuestion)
          .createQueryBuilder()
          .delete()
          .from(MeetingQuestion)
          .where('questionnaire_id = :questionnaireId', {
            questionnaireId,
          })
          .andWhere('"order" > 1')
          .execute()

        for (const [index, generatedQuestion] of followUpQuestions.entries()) {
          const questionRepository = manager.getRepository(MeetingQuestion)
          const question = await questionRepository.save(
            questionRepository.create({
              questionnaire: current,
              order: index + 2,
              dimensionCode: generatedQuestion.dimensionCode,
              text: generatedQuestion.text,
            }),
          )
          const optionRepository = manager.getRepository(MeetingQuestionOption)
          await optionRepository.save(
            generatedQuestion.options.map((option, optionIndex) =>
              optionRepository.create({
                question,
                order: optionIndex + 1,
                semanticCode: option.semanticCode,
                emoji: option.emoji,
                label: option.label,
              }),
            ),
          )
        }

        await questionnaireRepository.update(current.id, {
          generationStatus: QuestionnaireGenerationStatus.Ready,
          source: generated.source,
          provider: generated.provider,
          model: generated.model,
          generationError: null,
          generatedAt: () => 'CURRENT_TIMESTAMP',
        })
      })
    } catch (error) {
      this.logger.error(
        `모임 후속 질문 생성에 실패했습니다. questionnaireId=${questionnaireId}`,
        error instanceof Error ? error.stack : String(error),
      )
      await this.failQuestionnaire(questionnaireId, generationAttempt, error)
    }
  }

  private async createGenerationContext(
    questionnaire: MeetingQuestionnaire,
  ): Promise<QuestionnaireGenerationContext> {
    const [steps, recommendations] = await Promise.all([
      this.dataSource.getRepository(CourseCategoryStep).find({
        where: { meeting: { id: questionnaire.meeting.id } },
        relations: { category: true },
        order: { order: 'ASC' },
      }),
      this.dataSource.getRepository(MeetingPlaceRecommendation).find({
        where: { meeting: { id: questionnaire.meeting.id } },
        relations: { place: { category: true } },
        order: { createdAt: 'ASC' },
      }),
    ])
    const recommendedPlaceCategoryMap = new Map<
      CategorySlug,
      QuestionnaireGenerationContext['recommendedPlaceCategories'][number]
    >()
    for (const recommendation of recommendations) {
      const category = recommendation.place.category
      const slug = category.slug as CategorySlug
      const summary = recommendedPlaceCategoryMap.get(slug)
      recommendedPlaceCategoryMap.set(slug, {
        slug,
        name: category.name,
        count: (summary?.count ?? 0) + 1,
      })
    }

    return {
      meetingName: questionnaire.meeting.name,
      meetingTypeCode: questionnaire.meeting.meetingType
        .code as MeetingTypeCode,
      meetingTypeName: questionnaire.meeting.meetingType.name,
      schedule: createScheduleContext(
        questionnaire.meeting.date,
        questionnaire.meeting.time,
      ),
      courseCategories: steps.map((step) => ({
        order: step.order,
        slug: step.category.slug as CategorySlug,
        name: step.category.name,
      })),
      recommendedPlaceCategories: [...recommendedPlaceCategoryMap.values()],
    }
  }

  private async failQuestionnaire(
    questionnaireId: string,
    generationAttempt: number,
    error: unknown,
  ): Promise<void> {
    const generationError =
      error instanceof Error ? error.message.slice(0, 1000) : String(error)
    await this.dataSource
      .getRepository(MeetingQuestionnaire)
      .createQueryBuilder()
      .update(MeetingQuestionnaire)
      .set({
        generationStatus: QuestionnaireGenerationStatus.Failed,
        generationError,
      })
      .where('id = :questionnaireId', { questionnaireId })
      .andWhere('generation_status = :status', {
        status: QuestionnaireGenerationStatus.Generating,
      })
      .andWhere('generation_attempt_count = :generationAttempt', {
        generationAttempt,
      })
      .execute()
  }
}
