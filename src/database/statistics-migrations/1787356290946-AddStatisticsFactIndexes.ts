import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStatisticsFactIndexes1787356290946
  implements MigrationInterface
{
  name = 'AddStatisticsFactIndexes1787356290946'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_place_selection_fact_place" ON "place_selection_fact" ("place_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_selection_fact_meeting_type_place" ON "place_selection_fact" ("meeting_type_id", "place_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_selection_fact_meeting_date_place" ON "place_selection_fact" ("meeting_date", "place_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_selection_fact_category_place" ON "place_selection_fact" ("place_category_id", "place_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_questionnaire_fact_question_option" ON "course_questionnaire_answer_fact" ("question_code", "option_code")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_questionnaire_fact_question_option"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_place_selection_fact_category_place"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_place_selection_fact_meeting_date_place"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_place_selection_fact_meeting_type_place"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_place_selection_fact_place"`,
    )
  }
}
