import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

// COURSE_CONFIRMED v2 이벤트의 질문 응답 컨텍스트를 보존하는 사실 테이블.
// place_selection_fact와 outbox_event_id로 조인하면 선택된 질문 옵션과
// 코스에 최종 포함된 장소의 관계를 재집계할 수 있다.
@Entity()
@Index(['meetingId', 'courseVersion'])
@Index('IDX_questionnaire_fact_question_option', ['questionCode', 'optionCode'])
@Check(`"outbox_event_id" > 0`)
@Check(`"meeting_id" > 0`)
@Check(`"course_generation_run_id" > 0`)
@Check(`"questionnaire_id" > 0`)
@Check(`"course_version" >= 1`)
@Check(`"questionnaire_version" >= 1`)
@Check(`"questionnaire_schema_version" >= 1`)
@Check(`"questionnaire_prompt_version" >= 1`)
@Check(`length("input_hash") = 64`)
@Check(`length("question_code") >= 1`)
@Check(`length("question_text") >= 1`)
@Check(`length("option_code") >= 1`)
@Check(`length("option_label") >= 1`)
@Check(`length("questionnaire_source") >= 1`)
@Check(`"questionnaire_source" IN ('LLM', 'FALLBACK')`)
@Check(`length("questionnaire_provider") >= 1`)
@Check(`length("questionnaire_model") >= 1`)
export class CourseQuestionnaireAnswerFact {
  @PrimaryColumn({ name: 'outbox_event_id', type: 'bigint' })
  outboxEventId: string

  @PrimaryColumn({ name: 'question_code', type: 'varchar', length: 50 })
  questionCode: string

  @Column({ name: 'question_text', type: 'varchar', length: 200 })
  questionText: string

  @Column({ name: 'option_code', type: 'varchar', length: 50 })
  optionCode: string

  @Column({ name: 'option_label', type: 'varchar', length: 100 })
  optionLabel: string

  @Column({ name: 'meeting_id', type: 'bigint' })
  meetingId: string

  @Column({ name: 'course_generation_run_id', type: 'bigint' })
  courseGenerationRunId: string

  @Column({ name: 'questionnaire_id', type: 'bigint' })
  questionnaireId: string

  @Column({ name: 'course_version' })
  courseVersion: number

  @Column({ name: 'questionnaire_version' })
  questionnaireVersion: number

  @Column({ name: 'questionnaire_schema_version' })
  questionnaireSchemaVersion: number

  @Column({ name: 'questionnaire_prompt_version' })
  questionnairePromptVersion: number

  @Column({ name: 'questionnaire_source', type: 'varchar', length: 20 })
  questionnaireSource: string

  @Column({ name: 'questionnaire_provider', type: 'varchar', length: 50 })
  questionnaireProvider: string

  @Column({ name: 'questionnaire_model', type: 'varchar', length: 100 })
  questionnaireModel: string

  @Column({ name: 'input_hash', type: 'char', length: 64 })
  inputHash: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
