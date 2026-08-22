import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMeetingQuestionnaire1787356287946
  implements MigrationInterface
{
  name = 'AddMeetingQuestionnaire1787356287946'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_questionnaire_generation_status_enum" AS ENUM('GENERATING', 'READY', 'FAILED')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_questionnaire_source_enum" AS ENUM('LLM', 'FALLBACK')`,
    )
    await queryRunner.query(
      `CREATE TABLE "meeting_questionnaire" (
        "id" BIGSERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "schema_version" integer NOT NULL,
        "prompt_version" integer NOT NULL,
        "generation_status" "public"."meeting_questionnaire_generation_status_enum" NOT NULL DEFAULT 'GENERATING',
        "source" "public"."meeting_questionnaire_source_enum",
        "provider" character varying(50) NOT NULL,
        "model" character varying(100) NOT NULL,
        "generation_error" text,
        "generated_at" TIMESTAMP,
        "meeting_id" bigint NOT NULL,
        CONSTRAINT "CHK_meeting_questionnaire_version" CHECK ("version" >= 1),
        CONSTRAINT "CHK_meeting_questionnaire_schema_version" CHECK ("schema_version" >= 1),
        CONSTRAINT "CHK_meeting_questionnaire_prompt_version" CHECK ("prompt_version" >= 1),
        CONSTRAINT "CHK_meeting_questionnaire_provider" CHECK (length("provider") >= 1),
        CONSTRAINT "CHK_meeting_questionnaire_model" CHECK (length("model") >= 1),
        CONSTRAINT "UQ_meeting_questionnaire_meeting_version" UNIQUE ("meeting_id", "version"),
        CONSTRAINT "PK_meeting_questionnaire" PRIMARY KEY ("id")
      )`,
    )
    await queryRunner.query(
      `CREATE TABLE "meeting_question" (
        "id" BIGSERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "order" integer NOT NULL,
        "dimension_code" character varying(50) NOT NULL,
        "text" character varying(200) NOT NULL,
        "questionnaire_id" bigint NOT NULL,
        CONSTRAINT "CHK_meeting_question_order" CHECK ("order" >= 1),
        CONSTRAINT "CHK_meeting_question_text" CHECK (length("text") >= 1),
        CONSTRAINT "CHK_meeting_question_dimension_code" CHECK (length("dimension_code") >= 1),
        CONSTRAINT "UQ_meeting_question_questionnaire_order" UNIQUE ("questionnaire_id", "order"),
        CONSTRAINT "UQ_meeting_question_questionnaire_dimension" UNIQUE ("questionnaire_id", "dimension_code"),
        CONSTRAINT "PK_meeting_question" PRIMARY KEY ("id")
      )`,
    )
    await queryRunner.query(
      `CREATE TABLE "meeting_question_option" (
        "id" BIGSERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "order" integer NOT NULL,
        "semantic_code" character varying(50) NOT NULL,
        "emoji" character varying(16) NOT NULL,
        "label" character varying(100) NOT NULL,
        "question_id" bigint NOT NULL,
        CONSTRAINT "CHK_meeting_question_option_order" CHECK ("order" >= 1),
        CONSTRAINT "CHK_meeting_question_option_semantic_code" CHECK (length("semantic_code") >= 1),
        CONSTRAINT "CHK_meeting_question_option_emoji" CHECK (length("emoji") >= 1),
        CONSTRAINT "CHK_meeting_question_option_label" CHECK (length("label") >= 1),
        CONSTRAINT "UQ_meeting_question_option_question_order" UNIQUE ("question_id", "order"),
        CONSTRAINT "UQ_meeting_question_option_question_semantic" UNIQUE ("question_id", "semantic_code"),
        CONSTRAINT "PK_meeting_question_option" PRIMARY KEY ("id")
      )`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_questionnaire" ADD CONSTRAINT "FK_meeting_questionnaire_meeting" FOREIGN KEY ("meeting_id") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_question" ADD CONSTRAINT "FK_meeting_question_questionnaire" FOREIGN KEY ("questionnaire_id") REFERENCES "meeting_questionnaire"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_question_option" ADD CONSTRAINT "FK_meeting_question_option_question" FOREIGN KEY ("question_id") REFERENCES "meeting_question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meeting_question_option" DROP CONSTRAINT "FK_meeting_question_option_question"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_question" DROP CONSTRAINT "FK_meeting_question_questionnaire"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_questionnaire" DROP CONSTRAINT "FK_meeting_questionnaire_meeting"`,
    )
    await queryRunner.query(`DROP TABLE "meeting_question_option"`)
    await queryRunner.query(`DROP TABLE "meeting_question"`)
    await queryRunner.query(`DROP TABLE "meeting_questionnaire"`)
    await queryRunner.query(
      `DROP TYPE "public"."meeting_questionnaire_source_enum"`,
    )
    await queryRunner.query(
      `DROP TYPE "public"."meeting_questionnaire_generation_status_enum"`,
    )
  }
}
