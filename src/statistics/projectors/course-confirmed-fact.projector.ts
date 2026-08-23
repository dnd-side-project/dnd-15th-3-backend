import {
  COURSE_CONFIRMED_PAYLOAD_VERSION,
  CourseConfirmedPayloadSchema,
} from 'src/outbox/schemas/course-confirmed-payload.schema'
import type { CourseQuestionnaireAnswerFact } from '../entities/course-questionnaire-answer-fact.stats-entity'
import type { PlaceSelectionFact } from '../entities/place-selection-fact.stats-entity'

export type PlaceSelectionFactProjection = Pick<
  PlaceSelectionFact,
  | 'outboxEventId'
  | 'placeId'
  | 'placeCategoryId'
  | 'meetingId'
  | 'meetingTypeId'
  | 'meetingDate'
  | 'meetingTime'
  | 'courseVersion'
  | 'participantCount'
  | 'likeCount'
  | 'dislikeCount'
  | 'courseGenerationRunId'
  | 'courseGenerationCustomizationType'
  | 'courseGenerationInputHash'
>

export type CourseQuestionnaireAnswerFactProjection = Pick<
  CourseQuestionnaireAnswerFact,
  | 'outboxEventId'
  | 'questionCode'
  | 'questionText'
  | 'optionCode'
  | 'optionLabel'
  | 'meetingId'
  | 'courseGenerationRunId'
  | 'questionnaireId'
  | 'courseVersion'
  | 'questionnaireVersion'
  | 'questionnaireSchemaVersion'
  | 'questionnairePromptVersion'
  | 'questionnaireSource'
  | 'questionnaireProvider'
  | 'questionnaireModel'
  | 'inputHash'
>

export type CourseConfirmedFactProjection = {
  placeSelections: PlaceSelectionFactProjection[]
  questionnaireAnswers: CourseQuestionnaireAnswerFactProjection[]
}

/**
 * v1/v2 COURSE_CONFIRMED 이벤트를 통계 DB에 upsert할 사실 row로 변환한다.
 * 재구성과 실시간 워커가 동일한 변환 규칙을 공유하도록 DB I/O와 분리했다.
 */
export function projectCourseConfirmedFacts(
  outboxEventId: string,
  rawPayload: unknown,
): CourseConfirmedFactProjection {
  const payload = CourseConfirmedPayloadSchema.parse(rawPayload)
  const generation =
    payload.payloadVersion === COURSE_CONFIRMED_PAYLOAD_VERSION
      ? payload.courseGeneration
      : null

  const placeSelections = payload.places.map((place) => ({
    outboxEventId,
    placeId: place.placeId,
    placeCategoryId: place.placeCategoryId,
    meetingId: payload.meetingId,
    meetingTypeId: payload.meetingTypeId,
    meetingDate: payload.meetingDate,
    meetingTime: payload.meetingTime,
    courseVersion: payload.courseVersion,
    participantCount: payload.participantCount,
    likeCount: place.likeCount,
    dislikeCount: place.dislikeCount,
    courseGenerationRunId: generation?.runId ?? null,
    courseGenerationCustomizationType: generation?.customizationType ?? null,
    courseGenerationInputHash: generation?.inputHash ?? null,
  }))

  if (payload.payloadVersion !== COURSE_CONFIRMED_PAYLOAD_VERSION) {
    return { placeSelections, questionnaireAnswers: [] }
  }

  const questionnaire = generation?.questionnaire
  if (!generation || !questionnaire) {
    return { placeSelections, questionnaireAnswers: [] }
  }
  const questionnaireAnswers = questionnaire.answers.map((answer) => ({
    outboxEventId,
    questionCode: answer.questionCode,
    questionText: answer.questionText,
    optionCode: answer.optionCode,
    optionLabel: answer.optionLabel,
    meetingId: payload.meetingId,
    courseGenerationRunId: generation.runId,
    questionnaireId: questionnaire.questionnaireId,
    courseVersion: payload.courseVersion,
    questionnaireVersion: questionnaire.questionnaireVersion,
    questionnaireSchemaVersion: questionnaire.schemaVersion,
    questionnairePromptVersion: questionnaire.promptVersion,
    questionnaireSource: questionnaire.source,
    questionnaireProvider: questionnaire.provider,
    questionnaireModel: questionnaire.model,
    inputHash: generation.inputHash,
  }))

  return { placeSelections, questionnaireAnswers }
}
