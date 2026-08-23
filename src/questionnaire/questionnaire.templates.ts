import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from './questionnaire.constants'
import { generatedQuestionSchema } from './schema/generated-questionnaire.schema'

export const FIRST_QUESTION_TEMPLATE = generatedQuestionSchema.parse({
  dimensionCode: QuestionnaireDimensionCode.primaryPurpose,
  text: '이번 모임에서 가장 놓치고 싶지 않은 건 무엇인가요?',
  options: [
    {
      semanticCode: QuestionnaireOptionCode.conversation,
      emoji: '💬',
      label: '편하게 오래 이야기하기',
    },
    {
      semanticCode: QuestionnaireOptionCode.newExperience,
      emoji: '✨',
      label: '새로운 장소와 경험 즐기기',
    },
    {
      semanticCode: QuestionnaireOptionCode.food,
      emoji: '🍽️',
      label: '맛있는 음식 제대로 즐기기',
    },
    {
      semanticCode: QuestionnaireOptionCode.memories,
      emoji: '📸',
      label: '사진과 추억 남기기',
    },
  ],
})
