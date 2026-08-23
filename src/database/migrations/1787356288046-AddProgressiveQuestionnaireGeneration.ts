import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddProgressiveQuestionnaireGeneration1787356288046
  implements MigrationInterface
{
  name = 'AddProgressiveQuestionnaireGeneration1787356288046'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meeting_questionnaire" ADD "generation_attempt_count" integer NOT NULL DEFAULT 0`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_questionnaire" ADD "generation_started_at" TIMESTAMP`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_questionnaire" ADD CONSTRAINT "CHK_meeting_questionnaire_generation_attempt_count" CHECK ("generation_attempt_count" >= 0)`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_meeting_questionnaire_generation_queue" ON "meeting_questionnaire" ("generation_started_at", "created_at") WHERE "generation_status" = 'GENERATING'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_meeting_questionnaire_generation_queue"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_questionnaire" DROP CONSTRAINT "CHK_meeting_questionnaire_generation_attempt_count"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_questionnaire" DROP COLUMN "generation_started_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_questionnaire" DROP COLUMN "generation_attempt_count"`,
    )
  }
}
