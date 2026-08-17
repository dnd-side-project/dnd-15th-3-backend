import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCourseCandidateNameAndSelectionConstraint1786406373222
  implements MigrationInterface
{
  name = 'AddCourseCandidateNameAndSelectionConstraint1786406373222'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_candidate" ADD "name" character varying(15)`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate" ALTER COLUMN "name" SET NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate" ADD CONSTRAINT "CHK_963c6d7a80d3a95445c722e3a6" CHECK (length("name") >= 1)`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_comment" ALTER COLUMN "content" TYPE character varying(300)`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0f393eaa5900eaba3271563ce3" ON "course_candidate" ("meeting_id") WHERE "is_selected" = true`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0f393eaa5900eaba3271563ce3"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_comment" ALTER COLUMN "content" TYPE text`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate" DROP CONSTRAINT "CHK_963c6d7a80d3a95445c722e3a6"`,
    )
    await queryRunner.query(`ALTER TABLE "course_candidate" DROP COLUMN "name"`)
  }
}
