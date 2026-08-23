import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CourseGenerationCustomizationType } from 'src/course/enums/course-generation-customization-type.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import {
  QUESTIONNAIRE_OPTION_CODES_BY_DIMENSION,
  QUESTIONNAIRE_QUESTION_COUNT,
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from 'src/questionnaire/questionnaire.constants'
import { z } from 'zod'

const BIGINT_MAX = 9223372036854775807n

export const COURSE_CONFIRMED_PAYLOAD_V1 = 1
export const COURSE_CONFIRMED_PAYLOAD_VERSION = 2

const idString = z
  .string()
  .regex(/^[1-9]\d*$/)
  .refine((value) => !/^[1-9]\d*$/.test(value) || BigInt(value) <= BIGINT_MAX, {
    message: 'id는 64비트 정수(bigint) 범위를 넘을 수 없습니다',
  })

const placeSchema = z
  .object({
    placeId: idString,
    placeCategoryId: idString,
    likeCount: z.number().int().min(0),
    dislikeCount: z.number().int().min(0),
  })
  .strict()

const commonFields = {
  meetingId: idString,
  // MEETING_PREFERRED 태그(모임 유형별 선택률) 계산에 쓰이는 모임 유형 참조값.
  meetingTypeId: idString,
  // 재구성 시 새로운 통계 기준을 적용할 수 있도록 원본 날짜와 시간을 유지한다.
  meetingDate: z.iso.date(),
  meetingTime: z.iso.time({ precision: 0 }),
  // 재확정이 추가되면 모임별 최신 버전만 집계하기 위한 값.
  courseVersion: z.number().int().min(1),
  participantCount: z.number().int().min(1),
  places: z
    .array(placeSchema)
    .min(1)
    .max(MAX_COURSE_STEPS)
    .refine(
      (places) =>
        new Set(places.map((place) => place.placeId)).size === places.length,
      { message: '같은 장소가 한 코스에 중복될 수 없습니다' },
    ),
}

const questionnaireAnswerSchema = z
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

const questionnaireContextSchema = z
  .object({
    questionnaireId: idString,
    questionnaireVersion: z.number().int().min(1),
    schemaVersion: z.number().int().min(1),
    promptVersion: z.number().int().min(1),
    source: z.enum(QuestionnaireSource),
    provider: z.string().trim().min(1).max(50),
    model: z.string().trim().min(1).max(100),
    answers: z
      .array(questionnaireAnswerSchema)
      .length(QUESTIONNAIRE_QUESTION_COUNT)
      .refine(
        (answers) =>
          new Set(answers.map((answer) => answer.questionCode)).size ===
          answers.length,
        { message: '질문 차원 코드가 중복될 수 없습니다' },
      ),
  })
  .strict()

const courseGenerationContextSchema = z
  .object({
    runId: idString,
    inputHash: z.string().regex(/^[0-9a-f]{64}$/),
    customizationType: z.enum(CourseGenerationCustomizationType),
    questionnaire: questionnaireContextSchema.nullable(),
  })
  .strict()
  .superRefine((generation, context) => {
    const expectsQuestionnaire =
      generation.customizationType ===
      CourseGenerationCustomizationType.Questionnaire
    if (expectsQuestionnaire !== (generation.questionnaire !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['questionnaire'],
        message:
          '질문 기반 코스 생성 여부와 질문 응답 스냅샷이 일치해야 합니다',
      })
    }
  })

function validateVoteCounts(
  data: {
    participantCount: number
    places: Array<{ likeCount: number; dislikeCount: number }>
  },
  context: z.RefinementCtx,
) {
  data.places.forEach((place, index) => {
    if (place.likeCount + place.dislikeCount > data.participantCount) {
      context.addIssue({
        code: 'custom',
        path: ['places', index],
        message:
          '각 장소의 좋아요와 싫어요의 합은 참여 인원 수를 넘을 수 없습니다',
      })
    }
  })
}

export const CourseConfirmedPayloadV1Schema = z
  .object({
    ...commonFields,
    payloadVersion: z.literal(COURSE_CONFIRMED_PAYLOAD_V1),
  })
  .strict()
  .superRefine(validateVoteCounts)

export const CourseConfirmedPayloadV2Schema = z
  .object({
    ...commonFields,
    payloadVersion: z.literal(COURSE_CONFIRMED_PAYLOAD_VERSION),
    // null은 생성 실행 이력 도입 전에 만들어진 legacy 코스를 의미한다.
    courseGeneration: courseGenerationContextSchema.nullable(),
  })
  .strict()
  .superRefine(validateVoteCounts)

export const CourseConfirmedPayloadSchema = z.union([
  CourseConfirmedPayloadV1Schema,
  CourseConfirmedPayloadV2Schema,
])

export type CourseConfirmedPayload = z.infer<
  typeof CourseConfirmedPayloadSchema
>
export type CourseConfirmedPayloadV2 = z.infer<
  typeof CourseConfirmedPayloadV2Schema
>
