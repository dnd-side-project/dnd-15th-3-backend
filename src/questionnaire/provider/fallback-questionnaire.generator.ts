import { Injectable } from '@nestjs/common'
import { QuestionnaireSource } from '../enums/questionnaire-source.enum'
import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from '../questionnaire.constants'
import { generatedFollowUpQuestionnaireSchema } from '../schema/generated-questionnaire.schema'
import type {
  QuestionnaireGenerationContext,
  QuestionnaireGenerationResult,
  QuestionnaireGenerator,
} from './questionnaire-generator'

@Injectable()
export class FallbackQuestionnaireGenerator implements QuestionnaireGenerator {
  generate(
    context: QuestionnaireGenerationContext,
  ): Promise<QuestionnaireGenerationResult> {
    const scheduleLabel = `${context.schedule.dayOfWeek} ${context.schedule.timePeriod}`
    const categoryNames = context.courseCategories.map(
      (category) => category.name,
    )
    const atmosphereSubject =
      categoryNames.length === 0
        ? '이번 모임의 장소'
        : categoryNames.length === 1
          ? `${categoryNames[0]} 장소`
          : `${categoryNames.slice(0, 2).join('·')}${categoryNames.length > 2 ? ' 등' : ''} 코스 장소`
    const questionnaire = generatedFollowUpQuestionnaireSchema.parse({
      questions: [
        {
          dimensionCode: QuestionnaireDimensionCode.coursePace,
          text: `${scheduleLabel} 코스는 어떤 흐름으로 즐기고 싶나요?`,
          options: [
            {
              semanticCode: QuestionnaireOptionCode.relaxed,
              emoji: '☕',
              label: '적은 곳에서 오래 머무르기',
            },
            {
              semanticCode: QuestionnaireOptionCode.efficient,
              emoji: '🚶',
              label: '가까운 곳끼리 편하게 이동하기',
            },
            {
              semanticCode: QuestionnaireOptionCode.fullSchedule,
              emoji: '🗺️',
              label: '다양한 곳을 알차게 둘러보기',
            },
            {
              semanticCode: QuestionnaireOptionCode.flexible,
              emoji: '🎲',
              label: '상황에 따라 코스를 바꾸기',
            },
          ],
        },
        {
          dimensionCode: QuestionnaireDimensionCode.atmosphere,
          text: `${atmosphereSubject}를 고를 때 어떤 분위기가 가장 끌리나요?`,
          options: [
            {
              semanticCode: QuestionnaireOptionCode.quiet,
              emoji: '🌿',
              label: '대화하기 좋은 조용한 곳',
            },
            {
              semanticCode: QuestionnaireOptionCode.cozy,
              emoji: '🛋️',
              label: '편안하고 아늑한 곳',
            },
            {
              semanticCode: QuestionnaireOptionCode.lively,
              emoji: '🎉',
              label: '활기와 에너지가 넘치는 곳',
            },
            {
              semanticCode: QuestionnaireOptionCode.scenic,
              emoji: '🌇',
              label: '풍경이나 사진이 예쁜 곳',
            },
          ],
        },
      ],
    })

    return Promise.resolve({
      questions: questionnaire.questions,
      source: QuestionnaireSource.Fallback,
      provider: 'internal',
      model: 'fallback-v1',
    })
  }
}
