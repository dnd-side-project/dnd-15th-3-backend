import { z } from 'zod'
import {
  QUESTIONNAIRE_FOLLOW_UP_DIMENSION_CODES,
  QUESTIONNAIRE_GENERATED_QUESTION_COUNT,
  QUESTIONNAIRE_OPTION_CODES_BY_DIMENSION,
  QUESTIONNAIRE_OPTION_COUNT,
  QUESTIONNAIRE_OPTION_LABEL_MAX_LENGTH,
  QUESTIONNAIRE_OPTION_LABEL_MIN_LENGTH,
  QUESTIONNAIRE_QUESTION_TEXT_MAX_LENGTH,
  QUESTIONNAIRE_QUESTION_TEXT_MIN_LENGTH,
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from '../questionnaire.constants'

const questionnaireDimensionCodes = Object.values(QuestionnaireDimensionCode)
const questionnaireOptionCodes = Object.values(QuestionnaireOptionCode)

const generatedOptionSchema = z
  .object({
    semanticCode: z.enum(questionnaireOptionCodes),
    emoji: z.string().trim().min(1).max(16),
    label: z
      .string()
      .trim()
      .min(QUESTIONNAIRE_OPTION_LABEL_MIN_LENGTH)
      .max(QUESTIONNAIRE_OPTION_LABEL_MAX_LENGTH),
  })
  .strict()

export const generatedQuestionSchema = z
  .object({
    dimensionCode: z.enum(questionnaireDimensionCodes),
    text: z
      .string()
      .trim()
      .min(QUESTIONNAIRE_QUESTION_TEXT_MIN_LENGTH)
      .max(QUESTIONNAIRE_QUESTION_TEXT_MAX_LENGTH)
      .endsWith('?', '질문은 물음표로 끝나야 합니다'),
    options: z.array(generatedOptionSchema).length(QUESTIONNAIRE_OPTION_COUNT),
  })
  .strict()
  .superRefine((question, context) => {
    const optionCodes = question.options.map((option) => option.semanticCode)
    if (new Set(optionCodes).size !== optionCodes.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: '한 질문 안에서 선택지 의미 코드가 중복될 수 없습니다',
      })
    }

    const optionLabels = question.options.map((option) => option.label)
    if (new Set(optionLabels).size !== optionLabels.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: '한 질문 안에서 선택지 문구가 중복될 수 없습니다',
      })
    }

    const allowedCodes = new Set(
      QUESTIONNAIRE_OPTION_CODES_BY_DIMENSION[question.dimensionCode],
    )
    optionCodes.forEach((code, index) => {
      if (!allowedCodes.has(code)) {
        context.addIssue({
          code: 'custom',
          path: ['options', index, 'semanticCode'],
          message: `${question.dimensionCode} 질문에서 사용할 수 없는 선택지 코드입니다`,
        })
      }
    })
  })

export const generatedFollowUpQuestionnaireSchema = z
  .object({
    questions: z
      .array(generatedQuestionSchema)
      .length(QUESTIONNAIRE_GENERATED_QUESTION_COUNT),
  })
  .strict()
  .superRefine((questionnaire, context) => {
    const dimensions = questionnaire.questions.map(
      (question) => question.dimensionCode,
    )
    if (new Set(dimensions).size !== dimensions.length) {
      context.addIssue({
        code: 'custom',
        path: ['questions'],
        message: '질문 의미 코드가 중복될 수 없습니다',
      })
    }

    const expectedDimensions = new Set<QuestionnaireDimensionCode>(
      QUESTIONNAIRE_FOLLOW_UP_DIMENSION_CODES,
    )
    dimensions.forEach((dimension, index) => {
      if (!expectedDimensions.has(dimension)) {
        context.addIssue({
          code: 'custom',
          path: ['questions', index, 'dimensionCode'],
          message: '후속 질문에서 사용할 수 없는 질문 의미 코드입니다',
        })
      }
    })

    QUESTIONNAIRE_FOLLOW_UP_DIMENSION_CODES.forEach(
      (expectedDimension, index) => {
        if (dimensions[index] !== expectedDimension) {
          context.addIssue({
            code: 'custom',
            path: ['questions', index, 'dimensionCode'],
            message: '후속 질문 차원 순서가 올바르지 않습니다',
          })
        }
      },
    )
  })

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>

export type GeneratedFollowUpQuestionnaire = z.infer<
  typeof generatedFollowUpQuestionnaireSchema
>
