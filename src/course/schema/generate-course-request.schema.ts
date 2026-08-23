import { QUESTIONNAIRE_QUESTION_COUNT } from 'src/questionnaire/questionnaire.constants'
import { z } from 'zod'
import { CourseGenerationCustomizationType } from '../enums/course-generation-customization-type.enum'

const BIGINT_MAX = 9223372036854775807n

const idString = z
  .string()
  .regex(/^[1-9]\d*$/)
  .refine((value) => !/^[1-9]\d*$/.test(value) || BigInt(value) <= BIGINT_MAX, {
    message: 'id는 64비트 정수(bigint) 범위를 넘을 수 없습니다',
  })

const skipCustomizationSchema = z
  .object({
    type: z.literal(CourseGenerationCustomizationType.Skip),
  })
  .strict()

const questionnaireCustomizationSchema = z
  .object({
    type: z.literal(CourseGenerationCustomizationType.Questionnaire),
    questionnaireId: idString,
    questionnaireVersion: z.number().int().min(1),
    answers: z
      .array(
        z
          .object({
            questionId: idString,
            optionId: idString,
          })
          .strict(),
      )
      .length(QUESTIONNAIRE_QUESTION_COUNT),
  })
  .strict()

export const generateCourseRequestSchema = z
  .object({
    customization: z.union([
      skipCustomizationSchema,
      questionnaireCustomizationSchema,
    ]),
  })
  .strict()

export type GenerateCourseRequest = z.infer<typeof generateCourseRequestSchema>
