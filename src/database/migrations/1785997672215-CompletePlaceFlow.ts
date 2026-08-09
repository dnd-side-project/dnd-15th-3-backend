import { MigrationInterface, QueryRunner } from 'typeorm'

export class CompletePlaceFlow1785997672215 implements MigrationInterface {
  name = 'CompletePlaceFlow1785997672215'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meeting_type" ADD "code" character varying(50)`,
    )
    await queryRunner.query(`
      UPDATE "meeting_type"
      SET "code" = CASE "display_order"
        WHEN 1 THEN 'SOCIAL'
        WHEN 2 THEN 'DATING_HOBBY'
        WHEN 3 THEN 'COMPANY_DINNER'
        WHEN 4 THEN 'FAMILY'
        WHEN 5 THEN 'TRAVEL'
        WHEN 6 THEN 'STUDY'
        WHEN 7 THEN 'BUSINESS'
        WHEN 8 THEN 'ANNIVERSARY_EXERCISE'
        WHEN 9 THEN 'OTHER'
      END
      WHERE "code" IS NULL
    `)
    await queryRunner.query(
      `ALTER TABLE "meeting_type" ALTER COLUMN "code" SET NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_type" ADD CONSTRAINT "UQ_meeting_type_code" UNIQUE ("code")`,
    )

    await queryRunner.query(
      `ALTER TYPE "public"."place_source_enum" ADD VALUE IF NOT EXISTS 'GOOGLE'`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ADD "provider_place_id" character varying(255)`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ADD "place_url" character varying(500)`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ADD "phone" character varying(50)`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ADD "road_address" character varying(255)`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ADD "provider_category_code" character varying(100)`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ADD "last_synced_at" TIMESTAMP`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ALTER COLUMN "preview_url" DROP NOT NULL`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_place_source_provider_place" ON "place" ("source", "provider_place_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_category" ON "place" ("category_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_last_synced_at" ON "place" ("last_synced_at")`,
    )

    await queryRunner.query(
      `ALTER TABLE "meeting_location" ADD "sync_version" integer NOT NULL DEFAULT 1`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_participant" ADD "profile_avatar_id" character varying(255) NOT NULL DEFAULT 'momo-blue'`,
    )
    await queryRunner.query(`
      UPDATE "meeting_participant" AS participant
      SET "profile_avatar_id" = COALESCE("user"."profile_avatar_id", 'momo-blue')
      FROM "user"
      WHERE "user"."id" = participant."user_id"
    `)
    await queryRunner.query(
      `COMMENT ON COLUMN "meeting_participant"."profile_avatar_id" IS 'Selected profile avatar identifier for this meeting'`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_participant" ALTER COLUMN "profile_avatar_id" DROP DEFAULT`,
    )
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "profile_avatar_id"`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_status_enum" AS ENUM('RECOMMENDATION_COLLECTING', 'COURSE_GENERATING', 'COURSE_GENERATED', 'COURSE_GENERATION_FAILED', 'COURSE_CONFIRMED')`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" ADD "status" "public"."meeting_status_enum" NOT NULL DEFAULT 'RECOMMENDATION_COLLECTING'`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" ADD "course_version" integer NOT NULL DEFAULT 1`,
    )

    await queryRunner.query(
      `ALTER TABLE "meeting" DROP CONSTRAINT "FK_0d70f1f50dba09be645503992f9"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" DROP COLUMN "first_location_place_id"`,
    )

    await queryRunner.query(
      `CREATE TYPE "public"."place_sync_job_status_enum" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')`,
    )
    await queryRunner.query(`
      CREATE TABLE "place_sync_job" (
        "id" BIGSERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "meeting_id" bigint NOT NULL,
        "category_id" bigint NOT NULL,
        "source" "public"."place_source_enum" NOT NULL,
        "location_version" integer NOT NULL,
        "center" geography(Point,4326) NOT NULL,
        "radius_meters" integer NOT NULL DEFAULT 2000,
        "status" "public"."place_sync_job_status_enum" NOT NULL DEFAULT 'PENDING',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "next_run_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "error_message" text,
        "result_count" integer NOT NULL DEFAULT 0,
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_place_sync_job" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_place_sync_job_scope" UNIQUE ("meeting_id", "category_id", "source", "location_version")
      )
    `)
    await queryRunner.query(
      `CREATE INDEX "IDX_place_sync_job_status_next_run" ON "place_sync_job" ("status", "next_run_at")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_sync_job_status_started_at" ON "place_sync_job" ("status", "started_at")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_place_sync_job_center" ON "place_sync_job" USING GiST ("center")`,
    )

    await queryRunner.query(`
      CREATE TABLE "place_sync_coverage" (
        "id" BIGSERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "category_id" bigint NOT NULL,
        "source" "public"."place_source_enum" NOT NULL,
        "tile_key" character varying(100) NOT NULL,
        "coverage" geography(Polygon,4326) NOT NULL,
        "last_synced_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_place_sync_coverage" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_place_sync_coverage_scope" UNIQUE ("source", "category_id", "tile_key")
      )
    `)
    await queryRunner.query(
      `CREATE INDEX "IDX_place_sync_coverage_area" ON "place_sync_coverage" USING GiST ("coverage")`,
    )

    await queryRunner.query(
      `ALTER TABLE "place_sync_job" ADD CONSTRAINT "FK_place_sync_job_meeting" FOREIGN KEY ("meeting_id") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_sync_job" ADD CONSTRAINT "FK_place_sync_job_category" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_sync_coverage" ADD CONSTRAINT "FK_place_sync_coverage_category" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )

    await queryRunner.query(`
      INSERT INTO "category" ("name", "slug", "display_order") VALUES
        ('카페', 'cafe', 2),
        ('음식점', 'restaurant', 1),
        ('산책 · 야경', 'walk', 4),
        ('술 · 바', 'bar', 3),
        ('팝업 · 쇼핑', 'shopping', 5),
        ('액티비티', 'activity', 6),
        ('문화 · 전시', 'culture', 7),
        ('기타', 'other', 8)
      ON CONFLICT ("slug") DO UPDATE SET
        "name" = EXCLUDED."name",
        "display_order" = EXCLUDED."display_order"
    `)
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('category', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM category), 1), true)`,
    )
    await queryRunner.query(`
      INSERT INTO "meeting_type" ("code", "name", "display_order") VALUES
        ('SOCIAL', '친목', 1),
        ('DATING_HOBBY', '데이트·취미', 2),
        ('COMPANY_DINNER', '회식', 3),
        ('FAMILY', '가족모임', 4),
        ('TRAVEL', '여행', 5),
        ('STUDY', '스터디', 6),
        ('BUSINESS', '비즈니스', 7),
        ('ANNIVERSARY_EXERCISE', '기념일·운동', 8),
        ('OTHER', '기타', 9)
      ON CONFLICT ("display_order") DO UPDATE SET
        "code" = EXCLUDED."code",
        "name" = EXCLUDED."name",
        "display_order" = EXCLUDED."display_order"
    `)
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('meeting_type', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM meeting_type), 1), true)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const meetingCount = await queryRunner.query(
      `SELECT COUNT(*)::int AS "count" FROM "meeting"`,
    )
    if (Number(meetingCount[0]?.count ?? 0) > 0) {
      throw new Error(
        'CompletePlaceFlow migration cannot restore first_location_place_id for existing meetings.',
      )
    }
    const googlePlaceCount = await queryRunner.query(
      `SELECT COUNT(*)::int AS "count" FROM "place" WHERE "source" = 'GOOGLE'`,
    )
    if (Number(googlePlaceCount[0]?.count ?? 0) > 0) {
      throw new Error(
        'CompletePlaceFlow migration cannot remove GOOGLE places during rollback.',
      )
    }
    const nullablePreviewCount = await queryRunner.query(
      `SELECT COUNT(*)::int AS "count" FROM "place" WHERE "preview_url" IS NULL`,
    )
    if (Number(nullablePreviewCount[0]?.count ?? 0) > 0) {
      throw new Error(
        'CompletePlaceFlow migration cannot restore preview_url NOT NULL while null values exist.',
      )
    }

    await queryRunner.query(
      `ALTER TABLE "user" ADD "profile_avatar_id" character varying(255)`,
    )
    await queryRunner.query(`
      UPDATE "user" AS user_account
      SET "profile_avatar_id" = participant."profile_avatar_id"
      FROM (
        SELECT DISTINCT ON ("user_id") "user_id", "profile_avatar_id"
        FROM "meeting_participant"
        ORDER BY "user_id", "id"
      ) AS participant
      WHERE participant."user_id" = user_account."id"
    `)
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."profile_avatar_id" IS 'Selected profile avatar identifier'`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_participant" DROP COLUMN "profile_avatar_id"`,
    )

    await queryRunner.query(
      `ALTER TABLE "place_sync_coverage" DROP CONSTRAINT "FK_place_sync_coverage_category"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_sync_job" DROP CONSTRAINT "FK_place_sync_job_category"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_sync_job" DROP CONSTRAINT "FK_place_sync_job_meeting"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_place_sync_coverage_area"`,
    )
    await queryRunner.query(`DROP TABLE "place_sync_coverage"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_place_sync_job_center"`)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_place_sync_job_status_started_at"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_place_sync_job_status_next_run"`,
    )
    await queryRunner.query(`DROP TABLE "place_sync_job"`)
    await queryRunner.query(`DROP TYPE "public"."place_sync_job_status_enum"`)

    await queryRunner.query(
      `ALTER TABLE "meeting" ADD "first_location_place_id" bigint`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" ADD CONSTRAINT "FK_0d70f1f50dba09be645503992f9" FOREIGN KEY ("first_location_place_id") REFERENCES "place"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_location" DROP COLUMN "sync_version"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" DROP COLUMN "course_version"`,
    )
    await queryRunner.query(`ALTER TABLE "meeting" DROP COLUMN "status"`)
    await queryRunner.query(`DROP TYPE "public"."meeting_status_enum"`)

    await queryRunner.query(`DROP INDEX "public"."IDX_place_last_synced_at"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_place_category"`)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_place_source_provider_place"`,
    )
    await queryRunner.query(`ALTER TABLE "place" DROP COLUMN "last_synced_at"`)
    await queryRunner.query(
      `ALTER TABLE "place" DROP COLUMN "provider_category_code"`,
    )
    await queryRunner.query(`ALTER TABLE "place" DROP COLUMN "road_address"`)
    await queryRunner.query(`ALTER TABLE "place" DROP COLUMN "phone"`)
    await queryRunner.query(`ALTER TABLE "place" DROP COLUMN "place_url"`)
    await queryRunner.query(
      `ALTER TABLE "place" DROP COLUMN "provider_place_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ALTER COLUMN "preview_url" SET NOT NULL`,
    )

    await queryRunner.query(
      `CREATE TYPE "public"."place_source_enum_old" AS ENUM('KAKAO')`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ALTER COLUMN "source" TYPE "public"."place_source_enum_old" USING "source"::text::"public"."place_source_enum_old"`,
    )
    await queryRunner.query(`DROP TYPE "public"."place_source_enum"`)
    await queryRunner.query(
      `ALTER TYPE "public"."place_source_enum_old" RENAME TO "place_source_enum"`,
    )

    await queryRunner.query(
      `ALTER TABLE "meeting_type" DROP CONSTRAINT "UQ_meeting_type_code"`,
    )
    await queryRunner.query(`ALTER TABLE "meeting_type" DROP COLUMN "code"`)
  }
}
