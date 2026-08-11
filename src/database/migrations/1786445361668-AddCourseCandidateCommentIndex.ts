import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCourseCandidateCommentIndex1786445361668
  implements MigrationInterface
{
  name = 'AddCourseCandidateCommentIndex1786445361668'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_f11ce3e4ae807236470704be43" ON "course_candidate_comment" ("course_candidate_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f11ce3e4ae807236470704be43"`,
    )
  }
}
