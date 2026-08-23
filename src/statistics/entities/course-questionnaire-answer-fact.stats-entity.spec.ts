import { getMetadataArgsStorage } from 'typeorm'
import { CourseQuestionnaireAnswerFact } from './course-questionnaire-answer-fact.stats-entity'

describe('CourseQuestionnaireAnswerFact entity', () => {
  it('outboxEventId와 questionCode를 복합 PK로 사용한다', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === CourseQuestionnaireAnswerFact,
    )
    const primaryColumns = columns
      .filter((column) => column.options.primary)
      .map((column) => column.propertyName)
      .sort()

    expect(primaryColumns).toEqual(['outboxEventId', 'questionCode'].sort())
  })

  it('모임·코스 버전으로 최신 확정 이벤트를 재집계할 수 있다', () => {
    const indices = getMetadataArgsStorage().indices.filter(
      (index) => index.target === CourseQuestionnaireAnswerFact,
    )

    expect(indices.map((index) => index.columns)).toEqual(
      expect.arrayContaining([['meetingId', 'courseVersion']]),
    )
  })

  it('핵심 식별자·버전·코드 제약을 등록한다', () => {
    const expressions = getMetadataArgsStorage()
      .checks.filter((check) => check.target === CourseQuestionnaireAnswerFact)
      .map((check) => check.expression)

    expect(expressions).toEqual(
      expect.arrayContaining([
        `"outbox_event_id" > 0`,
        `"meeting_id" > 0`,
        `"course_generation_run_id" > 0`,
        `"questionnaire_id" > 0`,
        `"course_version" >= 1`,
        `length("input_hash") = 64`,
        `length("question_code") >= 1`,
        `length("question_text") >= 1`,
        `length("option_code") >= 1`,
        `length("option_label") >= 1`,
        `length("questionnaire_source") >= 1`,
        `"questionnaire_source" IN ('LLM', 'FALLBACK')`,
        `length("questionnaire_provider") >= 1`,
        `length("questionnaire_model") >= 1`,
      ]),
    )
  })
})
