import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCourseGenerationRun1787356288946 implements MigrationInterface {
  name = 'AddCourseGenerationRun1787356288946'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."course_generation_run_status_enum" AS ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."course_generation_run_customization_type_enum" AS ENUM('SKIP', 'QUESTIONNAIRE')`,
    )
    await queryRunner.query(
      `CREATE TABLE "course_generation_run" (
        "id" BIGSERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "run_version" integer NOT NULL,
        "status" "public"."course_generation_run_status_enum" NOT NULL DEFAULT 'PENDING',
        "customization_type" "public"."course_generation_run_customization_type_enum" NOT NULL,
        "input_snapshot" jsonb NOT NULL,
        "input_hash" character(64) NOT NULL,
        "output_snapshot" jsonb,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "meeting_id" bigint NOT NULL,
        "requested_by_participant_id" bigint NOT NULL,
        "questionnaire_id" bigint,
        CONSTRAINT "CHK_course_generation_run_version" CHECK ("run_version" >= 1),
        CONSTRAINT "CHK_course_generation_run_attempt_count" CHECK ("attempt_count" >= 0),
        CONSTRAINT "CHK_course_generation_run_input_hash" CHECK (length("input_hash") = 64),
        CONSTRAINT "CHK_course_generation_run_questionnaire" CHECK (("customization_type" = 'QUESTIONNAIRE') = ("questionnaire_id" IS NOT NULL)),
        CONSTRAINT "CHK_course_generation_run_output" CHECK (("status" = 'SUCCEEDED') = ("output_snapshot" IS NOT NULL)),
        CONSTRAINT "CHK_course_generation_run_completed" CHECK (("status" IN ('SUCCEEDED', 'FAILED')) = ("completed_at" IS NOT NULL)),
        CONSTRAINT "CHK_course_generation_run_started" CHECK ("status" <> 'PROCESSING' OR "started_at" IS NOT NULL),
        CONSTRAINT "UQ_course_generation_run_meeting_version" UNIQUE ("meeting_id", "run_version"),
        CONSTRAINT "PK_course_generation_run" PRIMARY KEY ("id")
      )`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_course_generation_run_active_meeting" ON "course_generation_run" ("meeting_id") WHERE "status" IN ('PENDING', 'PROCESSING')`,
    )
    await queryRunner.query(
      `CREATE TABLE "course_generation_questionnaire_answer" (
        "id" BIGSERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "generation_run_id" bigint NOT NULL,
        "question_id" bigint NOT NULL,
        "option_id" bigint NOT NULL,
        CONSTRAINT "UQ_course_generation_answer_run_question" UNIQUE ("generation_run_id", "question_id"),
        CONSTRAINT "PK_course_generation_questionnaire_answer" PRIMARY KEY ("id")
      )`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate" ADD "generation_run_id" bigint`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_run" ADD CONSTRAINT "FK_course_generation_run_meeting" FOREIGN KEY ("meeting_id") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_run" ADD CONSTRAINT "FK_course_generation_run_participant" FOREIGN KEY ("requested_by_participant_id") REFERENCES "meeting_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_run" ADD CONSTRAINT "FK_course_generation_run_questionnaire" FOREIGN KEY ("questionnaire_id") REFERENCES "meeting_questionnaire"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_questionnaire_answer" ADD CONSTRAINT "FK_course_generation_answer_run" FOREIGN KEY ("generation_run_id") REFERENCES "course_generation_run"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_questionnaire_answer" ADD CONSTRAINT "FK_course_generation_answer_question" FOREIGN KEY ("question_id") REFERENCES "meeting_question"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_questionnaire_answer" ADD CONSTRAINT "FK_course_generation_answer_option" FOREIGN KEY ("option_id") REFERENCES "meeting_question_option"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate" ADD CONSTRAINT "FK_course_candidate_generation_run" FOREIGN KEY ("generation_run_id") REFERENCES "course_generation_run"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_candidate" DROP CONSTRAINT "FK_course_candidate_generation_run"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_questionnaire_answer" DROP CONSTRAINT "FK_course_generation_answer_option"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_questionnaire_answer" DROP CONSTRAINT "FK_course_generation_answer_question"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_questionnaire_answer" DROP CONSTRAINT "FK_course_generation_answer_run"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_run" DROP CONSTRAINT "FK_course_generation_run_questionnaire"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_run" DROP CONSTRAINT "FK_course_generation_run_participant"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_generation_run" DROP CONSTRAINT "FK_course_generation_run_meeting"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate" DROP COLUMN "generation_run_id"`,
    )
    await queryRunner.query(
      `DROP TABLE "course_generation_questionnaire_answer"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_course_generation_run_active_meeting"`,
    )
    await queryRunner.query(`DROP TABLE "course_generation_run"`)
    await queryRunner.query(
      `DROP TYPE "public"."course_generation_run_customization_type_enum"`,
    )
    await queryRunner.query(
      `DROP TYPE "public"."course_generation_run_status_enum"`,
    )
  }
}
