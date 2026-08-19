import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPostgisPlaceLocation1785997671215
  implements MigrationInterface
{
  name = 'AddPostgisPlaceLocation1785997671215'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`)
    await queryRunner.query(
      `ALTER TABLE "place" ADD "location" geography(Point,4326)`,
    )
    await queryRunner.query(
      `UPDATE "place" SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ALTER COLUMN "location" SET NOT NULL`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_location" ON "place" USING GiST ("location")`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ALTER COLUMN "preview_url" DROP NOT NULL`,
    )
    await queryRunner.query(`
      CREATE TABLE "meeting_location" (
        "id" BIGSERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "display_name" character varying(100) NOT NULL,
        "address" character varying(255) NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "external_address_id" character varying(255),
        "location" geography(Point,4326) NOT NULL,
        "meeting_id" bigint NOT NULL,
        CONSTRAINT "PK_meeting_location" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_meeting_location_display_name"
          CHECK (length("display_name") >= 1),
        CONSTRAINT "CHK_meeting_location_address"
          CHECK (length("address") >= 1),
        CONSTRAINT "CHK_meeting_location_latitude"
          CHECK ("latitude" BETWEEN -90 AND 90),
        CONSTRAINT "CHK_meeting_location_longitude"
          CHECK ("longitude" BETWEEN -180 AND 180)
      )
    `)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_meeting_location_meeting" ON "meeting_location" ("meeting_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_meeting_location_location" ON "meeting_location" USING GiST ("location")`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_location" ADD CONSTRAINT "FK_meeting_location_meeting" FOREIGN KEY ("meeting_id") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(`
      INSERT INTO "meeting_location" (
        "display_name",
        "address",
        "latitude",
        "longitude",
        "external_address_id",
        "location",
        "meeting_id"
      )
      SELECT
        "place"."name",
        "place"."address",
        "place"."latitude",
        "place"."longitude",
        NULL,
        ST_SetSRID(
          ST_MakePoint("place"."longitude", "place"."latitude"),
          4326
        )::geography,
        "meeting"."id"
      FROM "meeting"
      INNER JOIN "place"
        ON "place"."id" = "meeting"."first_location_place_id"
      ON CONFLICT ("meeting_id") DO NOTHING
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meeting_location" DROP CONSTRAINT "FK_meeting_location_meeting"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_meeting_location_meeting"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_meeting_location_location"`,
    )
    await queryRunner.query(`DROP TABLE "meeting_location"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_place_location"`)
    await queryRunner.query(`ALTER TABLE "place" DROP COLUMN "location"`)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'place'
            AND column_name = 'preview_url'
        ) THEN
          ALTER TABLE "place" ALTER COLUMN "preview_url" SET NOT NULL;
        END IF;
      END $$
    `)
  }
}
