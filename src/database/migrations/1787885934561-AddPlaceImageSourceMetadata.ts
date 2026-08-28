import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPlaceImageSourceMetadata1787885934561
  implements MigrationInterface
{
  name = 'AddPlaceImageSourceMetadata1787885934561'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."place_image_source_enum" AS ENUM('OWNED', 'TOUR', 'KAKAO')`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_image" ADD "source" "public"."place_image_source_enum" NOT NULL DEFAULT 'OWNED'`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_image" ADD "attributions" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "place_image" DROP COLUMN "attributions"`,
    )
    await queryRunner.query(`ALTER TABLE "place_image" DROP COLUMN "source"`)
    await queryRunner.query(`DROP TYPE "public"."place_image_source_enum"`)
  }
}
