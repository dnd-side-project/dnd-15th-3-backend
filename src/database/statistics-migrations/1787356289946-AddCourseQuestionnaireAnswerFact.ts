import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCourseQuestionnaireAnswerFact1787356289946
  implements MigrationInterface
{
  name = 'AddCourseQuestionnaireAnswerFact1787356289946'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" ADD "course_generation_run_id" bigint`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" ADD "course_generation_customization_type" character varying(20)`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" ADD "course_generation_input_hash" character(64)`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" ADD CONSTRAINT "CHK_place_selection_fact_generation_fields" CHECK (("course_generation_run_id" IS NULL AND "course_generation_customization_type" IS NULL AND "course_generation_input_hash" IS NULL) OR ("course_generation_run_id" IS NOT NULL AND "course_generation_customization_type" IS NOT NULL AND "course_generation_input_hash" IS NOT NULL))`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" ADD CONSTRAINT "CHK_place_selection_fact_generation_run" CHECK ("course_generation_run_id" IS NULL OR "course_generation_run_id" > 0)`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" ADD CONSTRAINT "CHK_place_selection_fact_customization" CHECK ("course_generation_customization_type" IS NULL OR "course_generation_customization_type" IN ('SKIP', 'QUESTIONNAIRE'))`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" ADD CONSTRAINT "CHK_place_selection_fact_input_hash" CHECK ("course_generation_input_hash" IS NULL OR length("course_generation_input_hash") = 64)`,
    )
    await queryRunner.query(
      `CREATE TABLE "course_questionnaire_answer_fact" (
        "outbox_event_id" bigint NOT NULL,
        "question_code" character varying(50) NOT NULL,
        "question_text" character varying(200) NOT NULL,
        "option_code" character varying(50) NOT NULL,
        "option_label" character varying(100) NOT NULL,
        "meeting_id" bigint NOT NULL,
        "course_generation_run_id" bigint NOT NULL,
        "questionnaire_id" bigint NOT NULL,
        "course_version" integer NOT NULL,
        "questionnaire_version" integer NOT NULL,
        "questionnaire_schema_version" integer NOT NULL,
        "questionnaire_prompt_version" integer NOT NULL,
        "questionnaire_source" character varying(20) NOT NULL,
        "questionnaire_provider" character varying(50) NOT NULL,
        "questionnaire_model" character varying(100) NOT NULL,
        "input_hash" character(64) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_course_questionnaire_fact_outbox" CHECK ("outbox_event_id" > 0),
        CONSTRAINT "CHK_course_questionnaire_fact_meeting" CHECK ("meeting_id" > 0),
        CONSTRAINT "CHK_course_questionnaire_fact_run" CHECK ("course_generation_run_id" > 0),
        CONSTRAINT "CHK_course_questionnaire_fact_questionnaire" CHECK ("questionnaire_id" > 0),
        CONSTRAINT "CHK_course_questionnaire_fact_course_version" CHECK ("course_version" >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_questionnaire_version" CHECK ("questionnaire_version" >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_schema_version" CHECK ("questionnaire_schema_version" >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_prompt_version" CHECK ("questionnaire_prompt_version" >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_input_hash" CHECK (length("input_hash") = 64),
        CONSTRAINT "CHK_course_questionnaire_fact_question_code" CHECK (length("question_code") >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_question_text" CHECK (length("question_text") >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_option_code" CHECK (length("option_code") >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_option_label" CHECK (length("option_label") >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_source" CHECK (length("questionnaire_source") >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_source_value" CHECK ("questionnaire_source" IN ('LLM', 'FALLBACK')),
        CONSTRAINT "CHK_course_questionnaire_fact_provider" CHECK (length("questionnaire_provider") >= 1),
        CONSTRAINT "CHK_course_questionnaire_fact_model" CHECK (length("questionnaire_model") >= 1),
        CONSTRAINT "PK_course_questionnaire_answer_fact" PRIMARY KEY ("outbox_event_id", "question_code")
      )`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_course_questionnaire_fact_meeting_version" ON "course_questionnaire_answer_fact" ("meeting_id", "course_version")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_course_questionnaire_fact_meeting_version"`,
    )
    await queryRunner.query(`DROP TABLE "course_questionnaire_answer_fact"`)
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" DROP CONSTRAINT IF EXISTS "CHK_place_selection_fact_input_hash"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" DROP CONSTRAINT IF EXISTS "CHK_place_selection_fact_customization"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" DROP CONSTRAINT IF EXISTS "CHK_place_selection_fact_generation_run"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" DROP CONSTRAINT IF EXISTS "CHK_place_selection_fact_generation_fields"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" DROP COLUMN IF EXISTS "course_generation_input_hash"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" DROP COLUMN IF EXISTS "course_generation_customization_type"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_selection_fact" DROP COLUMN IF EXISTS "course_generation_run_id"`,
    )
  }
}
