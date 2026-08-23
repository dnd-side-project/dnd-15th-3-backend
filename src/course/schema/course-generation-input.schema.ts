import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import {
  QUESTIONNAIRE_OPTION_CODES_BY_DIMENSION,
  QUESTIONNAIRE_QUESTION_COUNT,
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from 'src/questionnaire/questionnaire.constants'
import { z } from 'zod'

const idString = z.string().regex(/^[1-9]\d*$/)

const questionnaireAnswerSnapshotSchema = z
  .object({
    questionCode: z.enum(QuestionnaireDimensionCode),
    questionText: z.string().min(1).max(200),
    optionCode: z.enum(QuestionnaireOptionCode),
    optionLabel: z.string().min(1).max(100),
  })
  .strict()
  .superRefine((answer, context) => {
    const allowedOptions = new Set(
      QUESTIONNAIRE_OPTION_CODES_BY_DIMENSION[answer.questionCode],
    )
    if (!allowedOptions.has(answer.optionCode)) {
      context.addIssue({
        code: 'custom',
        path: ['optionCode'],
        message: '질문 차원과 선택지 의미 코드가 일치하지 않습니다',
      })
    }
  })

const questionnaireSnapshotSchema = z
  .object({
    questionnaireId: idString,
    questionnaireVersion: z.number().int().min(1),
    schemaVersion: z.number().int().min(1),
    promptVersion: z.number().int().min(1),
    source: z.enum(QuestionnaireSource),
    provider: z.string().trim().min(1).max(50),
    model: z.string().trim().min(1).max(100),
    answers: z
      .array(questionnaireAnswerSnapshotSchema)
      .length(QUESTIONNAIRE_QUESTION_COUNT)
      .refine(
        (answers) =>
          new Set(answers.map((answer) => answer.questionCode)).size ===
          answers.length,
        { message: '질문 차원 코드가 중복될 수 없습니다' },
      ),
  })
  .strict()

const recommendationCommonFields = {
  recommendationId: idString,
  placeId: idString,
  placeCategoryId: idString,
  categorySlug: z.enum(CategorySlug),
  likeCount: z.number().int().min(0),
  dislikeCount: z.number().int().min(0),
}

const persistedRecommendationSchema = z
  .object({
    ...recommendationCommonFields,
    name: z.string().min(1).max(100),
    address: z.string().min(1).max(255),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict()

const kakaoRecommendationReferenceSchema = z
  .object({
    ...recommendationCommonFields,
    source: z.literal(PlaceSource.Kakao),
    providerPlaceId: z.string().trim().min(1).max(255),
    placeUrl: z.string().url().max(500).nullable(),
  })
  .strict()

const recommendationSnapshotSchema = z.union([
  kakaoRecommendationReferenceSchema,
  persistedRecommendationSchema,
])

export const courseGenerationInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    meeting: z
      .object({
        meetingId: idString,
        meetingTypeId: idString,
        meetingTypeCode: z.enum(MeetingTypeCode),
        date: z.iso.date(),
        time: z.iso.time({ precision: 0 }),
        courseVersion: z.number().int().min(1),
        location: z
          .object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
          })
          .strict(),
      })
      .strict(),
    participantCount: z.number().int().min(1),
    categorySteps: z.array(
      z
        .object({
          order: z.number().int().min(1),
          categoryId: idString,
          categorySlug: z.enum(CategorySlug),
        })
        .strict(),
    ),
    recommendations: z.array(recommendationSnapshotSchema),
    questionnaire: questionnaireSnapshotSchema.nullable(),
  })
  .strict()

export type CourseGenerationInputSnapshot = z.infer<
  typeof courseGenerationInputSchema
>

export type CourseGenerationRuntimeRecommendation =
  CourseGenerationInputSnapshot['recommendations'][number] & {
    name: string
    address: string
    latitude: number
    longitude: number
  }

export type CourseGenerationRuntimeInput = Omit<
  CourseGenerationInputSnapshot,
  'recommendations'
> & {
  recommendations: CourseGenerationRuntimeRecommendation[]
}
