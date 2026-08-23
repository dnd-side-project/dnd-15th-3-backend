import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPlaceLookupQuery1787474938190 implements MigrationInterface {
  name = 'AddPlaceLookupQuery1787474938190'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "place" ADD "lookup_query" character varying(100)`,
    )
    await queryRunner.query(
      `COMMENT ON COLUMN "place"."lookup_query" IS 'User-entered query used to repeat a live provider lookup; never provider response data'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "place" DROP COLUMN "lookup_query"`)
  }
}
