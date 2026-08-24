import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPlacePhotoMatch1787535820507 implements MigrationInterface {
  name = 'AddPlacePhotoMatch1787535820507'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."place_photo_match_provider_enum" AS ENUM('KAKAO', 'GOOGLE')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."place_photo_match_status_enum" AS ENUM('MATCHED', 'AMBIGUOUS', 'NOT_FOUND')`,
    )
    await queryRunner.query(
      `CREATE TABLE "place_photo_match" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "provider" "public"."place_photo_match_provider_enum" NOT NULL, "provider_place_id" character varying(255), "status" "public"."place_photo_match_status_enum" NOT NULL, "confidence" double precision, "checked_at" TIMESTAMP NOT NULL, "expires_at" TIMESTAMP NOT NULL, "place_id" bigint NOT NULL, CONSTRAINT "PK_place_photo_match" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_place_photo_match_place_provider" ON "place_photo_match" ("place_id", "provider")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_photo_match_expiry" ON "place_photo_match" ("expires_at")`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_photo_match" ADD CONSTRAINT "FK_place_photo_match_place" FOREIGN KEY ("place_id") REFERENCES "place"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "place_photo_match" DROP CONSTRAINT "FK_place_photo_match_place"`,
    )
    await queryRunner.query(`DROP INDEX "IDX_place_photo_match_expiry"`)
    await queryRunner.query(`DROP INDEX "IDX_place_photo_match_place_provider"`)
    await queryRunner.query(`DROP TABLE "place_photo_match"`)
    await queryRunner.query(
      `DROP TYPE "public"."place_photo_match_status_enum"`,
    )
    await queryRunner.query(
      `DROP TYPE "public"."place_photo_match_provider_enum"`,
    )
  }
}
