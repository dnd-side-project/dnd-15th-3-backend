import { MigrationInterface, QueryRunner } from 'typeorm'

export class SchemaMigration1785997670215 implements MigrationInterface {
  name = 'SchemaMigration1785997670215'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "category" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(10) NOT NULL, "slug" character varying(50) NOT NULL, "display_order" integer NOT NULL, CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "UQ_cb73208f151aa71cdd78f662d70" UNIQUE ("slug"), CONSTRAINT "UQ_e3859e55989e7f6e9d6da5a1fbb" UNIQUE ("display_order"), CONSTRAINT "CHK_44c347a02794181f3aae6bbaaa" CHECK ("slug" ~ '^[a-z0-9-]+$'), CONSTRAINT "CHK_6c038c0782292680acef13f20d" CHECK (length("name") >= 1), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id")); COMMENT ON COLUMN "category"."name" IS 'Category display name'; COMMENT ON COLUMN "category"."slug" IS 'Unique identifier used in URL'`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."media_asset_mime_type_enum" AS ENUM('image/jpeg', 'image/png', 'image/webp')`,
    )
    await queryRunner.query(
      `CREATE TABLE "media_asset" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "object_key" character varying NOT NULL, "source_url" character varying(500), "mime_type" "public"."media_asset_mime_type_enum" NOT NULL, CONSTRAINT "UQ_12800ea6c721470eae403ae6c3d" UNIQUE ("object_key"), CONSTRAINT "UQ_a124377461ff80fbdd41598b418" UNIQUE ("source_url"), CONSTRAINT "CHK_7393432cdbc6c5b5b03b521e73" CHECK ("source_url" IS NULL OR length("source_url") >= 1), CONSTRAINT "CHK_9662d9ff4a73f9d01c047b837f" CHECK (length("object_key") >= 1), CONSTRAINT "PK_facd363e2bf84400ac44913a2f3" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "user" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_key" character varying(255) NOT NULL, "profile_avatar_id" character varying(255), CONSTRAINT "UQ_80f51961315535a88716fd114f9" UNIQUE ("user_key"), CONSTRAINT "CHK_1d5b6bddaa2fce7ec98c48d915" CHECK (length("user_key") >= 1), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")); COMMENT ON COLUMN "user"."profile_avatar_id" IS 'Selected profile avatar identifier'`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."place_source_enum" AS ENUM('KAKAO')`,
    )
    await queryRunner.query(
      `CREATE TABLE "place" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "address" character varying(255) NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "source" "public"."place_source_enum" NOT NULL, "preview_url" character varying(100) NOT NULL, "category_id" bigint NOT NULL, CONSTRAINT "CHK_42e5d676aa046dd616c3906129" CHECK ("longitude" BETWEEN -180 AND 180), CONSTRAINT "CHK_0de73d63c36987e44dd3ff4101" CHECK ("latitude" BETWEEN -90 AND 90), CONSTRAINT "CHK_5aa6c030f721da44c3fcf53484" CHECK (length("address") >= 1), CONSTRAINT "CHK_12bbe53de6f8be5e0b36eccbe3" CHECK (length("name") >= 1), CONSTRAINT "PK_96ab91d43aa89c5de1b59ee7cca" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "meeting_type" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(10) NOT NULL, "display_order" integer NOT NULL, CONSTRAINT "UQ_1162e7fc6906f3af31292428aa4" UNIQUE ("name"), CONSTRAINT "UQ_3438992effb8c2fd151d83e4d00" UNIQUE ("display_order"), CONSTRAINT "CHK_8ce2531887b7abb6a9c2f29bdc" CHECK (length("name") >= 1), CONSTRAINT "PK_372a5090439ea64c096d5b7e06e" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "meeting" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(10) NOT NULL, "date" date NOT NULL, "time" TIME NOT NULL, "access_token" character varying NOT NULL, "course_image_key" character varying, "course_image_uploaded_at" TIMESTAMP, "meeting_type_id" bigint NOT NULL, "first_location_place_id" bigint NOT NULL, CONSTRAINT "UQ_77f7ef3ba7d8967dedd97f300fc" UNIQUE ("access_token"), CONSTRAINT "UQ_d3eddf01968c6f436831dc54833" UNIQUE ("course_image_key"), CONSTRAINT "CHK_0e03bce20dd1de8bbb204cb212" CHECK (length("name") >= 1), CONSTRAINT "PK_dccaf9e4c0e39067d82ccc7bb83" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_participant_role_enum" AS ENUM('HOST', 'MEMBER')`,
    )
    await queryRunner.query(
      `CREATE TABLE "meeting_participant" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "role" "public"."meeting_participant_role_enum" NOT NULL, "access_token" character varying(255) NOT NULL, "nickname" character varying(10) NOT NULL, "meeting_id" bigint NOT NULL, "user_id" bigint NOT NULL, CONSTRAINT "UQ_3d9fd9660f03f8f8f0b3c60871b" UNIQUE ("access_token"), CONSTRAINT "UQ_f20c66bd575365a3fcc95704974" UNIQUE ("meeting_id", "user_id"), CONSTRAINT "CHK_268221f1a6c17dfcbbbf3ebe10" CHECK (length("nickname") >= 1), CONSTRAINT "CHK_1d1a57c23654380248d5b634b3" CHECK (length("access_token") >= 1), CONSTRAINT "PK_076322be51eef11585f17a45c66" PRIMARY KEY ("id")); COMMENT ON COLUMN "meeting_participant"."access_token" IS 'Participant-scoped session token'`,
    )
    await queryRunner.query(
      `CREATE TABLE "course_candidate" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order" integer NOT NULL, "is_selected" boolean NOT NULL DEFAULT false, "meeting_id" bigint NOT NULL, CONSTRAINT "UQ_9456cb8b048c44be9efada3afa5" UNIQUE ("meeting_id", "order"), CONSTRAINT "PK_1cddc7de9e5c1fda38794c2343b" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "course_candidate_comment" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "content" text NOT NULL, "course_candidate_id" bigint NOT NULL, "participant_id" bigint NOT NULL, CONSTRAINT "CHK_c12fa6a58662dde498ea14166b" CHECK (length("content") >= 1), CONSTRAINT "PK_1df9d7a133ac8d398b880c2e6b8" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "meeting_place_recommendation" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "meeting_id" bigint NOT NULL, "place_id" bigint NOT NULL, "recommended_by" bigint NOT NULL, CONSTRAINT "PK_8b358dd1fa71810cd561a046ec5" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6c603b1d8b2556de0e1e8a6112" ON "meeting_place_recommendation"  ("meeting_id", "place_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "course_candidate_place" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order" integer NOT NULL, "travel_time_to_next" integer, "course_candidate_id" bigint NOT NULL, "meeting_place_recommendation_id" bigint NOT NULL, CONSTRAINT "UQ_d67c1cbc949f0fa904407ec3e44" UNIQUE ("course_candidate_id", "order"), CONSTRAINT "PK_3c300573279578a67fb5e1eedc2" PRIMARY KEY ("id")); COMMENT ON COLUMN "course_candidate_place"."travel_time_to_next" IS 'Unit: seconds'`,
    )
    await queryRunner.query(
      `CREATE TABLE "course_category_step" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order" integer NOT NULL, "meeting_id" bigint NOT NULL, "category_id" bigint NOT NULL, CONSTRAINT "UQ_d69879e894931eb5ff404e487bf" UNIQUE ("meeting_id", "order"), CONSTRAINT "PK_d5c0b73955808111c140dc4a57d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."meeting_place_recommendation_vote_preference_enum" AS ENUM('LIKE', 'DISLIKE')`,
    )
    await queryRunner.query(
      `CREATE TABLE "meeting_place_recommendation_vote" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "preference" "public"."meeting_place_recommendation_vote_preference_enum" NOT NULL, "recommendation_id" bigint NOT NULL, "participant_id" bigint NOT NULL, CONSTRAINT "PK_9e98e3ba0ae42b1e13dab1f3a88" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4766078ad5ec0b75a4419f3531" ON "meeting_place_recommendation_vote"  ("recommendation_id", "participant_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "place_image" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "display_order" integer NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "place_id" bigint NOT NULL, "media_asset_id" bigint NOT NULL, CONSTRAINT "PK_321b2db7828123af67c2afc42f0" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fafc9bfcfe7fd8a987dfd9b62e" ON "place_image"  ("place_id", "display_order") `,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3ce74300098bd953d8cfa43039" ON "place_image"  ("place_id") WHERE "is_primary" = true`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."place_review_summary_source_enum" AS ENUM('KAKAO')`,
    )
    await queryRunner.query(
      `CREATE TABLE "place_review_summary" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "summary_text" text NOT NULL, "source" "public"."place_review_summary_source_enum" NOT NULL, "crawled_at" TIMESTAMP NOT NULL DEFAULT now(), "place_id" bigint NOT NULL, CONSTRAINT "REL_74bf63dc647497344cd2ae83c4" UNIQUE ("place_id"), CONSTRAINT "PK_b3bccee77b03b8482aa3b33231e" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" ADD CONSTRAINT "FK_5a9a0f535f8481c45d83c280296" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" ADD CONSTRAINT "FK_88f688cf4189df2fe308143543a" FOREIGN KEY ("meeting_type_id") REFERENCES "meeting_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" ADD CONSTRAINT "FK_0d70f1f50dba09be645503992f9" FOREIGN KEY ("first_location_place_id") REFERENCES "place"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_participant" ADD CONSTRAINT "FK_edff9f9b6ac4c6d5a813f008885" FOREIGN KEY ("meeting_id") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_participant" ADD CONSTRAINT "FK_35edf82b08f79f550658689abe9" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate" ADD CONSTRAINT "FK_ffb3a4b96938869d9838403b4e7" FOREIGN KEY ("meeting_id") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_comment" ADD CONSTRAINT "FK_f11ce3e4ae807236470704be434" FOREIGN KEY ("course_candidate_id") REFERENCES "course_candidate"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_comment" ADD CONSTRAINT "FK_0484c75d341eff5d7da65d61950" FOREIGN KEY ("participant_id") REFERENCES "meeting_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation" ADD CONSTRAINT "FK_c7d2f88fa806cb556b15c6aaaae" FOREIGN KEY ("meeting_id") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation" ADD CONSTRAINT "FK_39d86a3cbd243c39a4ca96cf861" FOREIGN KEY ("place_id") REFERENCES "place"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation" ADD CONSTRAINT "FK_7418eb3d486adb85341b9376c88" FOREIGN KEY ("recommended_by") REFERENCES "meeting_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" ADD CONSTRAINT "FK_8ad20d88d836187d22082613020" FOREIGN KEY ("course_candidate_id") REFERENCES "course_candidate"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" ADD CONSTRAINT "FK_4adc866429e52a987f6e0241288" FOREIGN KEY ("meeting_place_recommendation_id") REFERENCES "meeting_place_recommendation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_category_step" ADD CONSTRAINT "FK_0a7bb808e572ac20090ea51b0a6" FOREIGN KEY ("meeting_id") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_category_step" ADD CONSTRAINT "FK_091689bb7f37fe0b5ec6c308043" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation_vote" ADD CONSTRAINT "FK_62763b19cfb90d804ad59246cd0" FOREIGN KEY ("recommendation_id") REFERENCES "meeting_place_recommendation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation_vote" ADD CONSTRAINT "FK_8e4ed981ccf03959ebbf52fbda3" FOREIGN KEY ("participant_id") REFERENCES "meeting_participant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_image" ADD CONSTRAINT "FK_ef9fcb6a7d95fd5f4242e696898" FOREIGN KEY ("place_id") REFERENCES "place"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_image" ADD CONSTRAINT "FK_56615ca495e2e920a1750cba5d6" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_review_summary" ADD CONSTRAINT "FK_74bf63dc647497344cd2ae83c46" FOREIGN KEY ("place_id") REFERENCES "place"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "place_review_summary" DROP CONSTRAINT "FK_74bf63dc647497344cd2ae83c46"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_image" DROP CONSTRAINT "FK_56615ca495e2e920a1750cba5d6"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place_image" DROP CONSTRAINT "FK_ef9fcb6a7d95fd5f4242e696898"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation_vote" DROP CONSTRAINT "FK_8e4ed981ccf03959ebbf52fbda3"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation_vote" DROP CONSTRAINT "FK_62763b19cfb90d804ad59246cd0"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_category_step" DROP CONSTRAINT "FK_091689bb7f37fe0b5ec6c308043"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_category_step" DROP CONSTRAINT "FK_0a7bb808e572ac20090ea51b0a6"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" DROP CONSTRAINT "FK_4adc866429e52a987f6e0241288"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" DROP CONSTRAINT "FK_8ad20d88d836187d22082613020"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation" DROP CONSTRAINT "FK_7418eb3d486adb85341b9376c88"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation" DROP CONSTRAINT "FK_39d86a3cbd243c39a4ca96cf861"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_place_recommendation" DROP CONSTRAINT "FK_c7d2f88fa806cb556b15c6aaaae"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_comment" DROP CONSTRAINT "FK_0484c75d341eff5d7da65d61950"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_comment" DROP CONSTRAINT "FK_f11ce3e4ae807236470704be434"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate" DROP CONSTRAINT "FK_ffb3a4b96938869d9838403b4e7"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_participant" DROP CONSTRAINT "FK_35edf82b08f79f550658689abe9"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting_participant" DROP CONSTRAINT "FK_edff9f9b6ac4c6d5a813f008885"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" DROP CONSTRAINT "FK_0d70f1f50dba09be645503992f9"`,
    )
    await queryRunner.query(
      `ALTER TABLE "meeting" DROP CONSTRAINT "FK_88f688cf4189df2fe308143543a"`,
    )
    await queryRunner.query(
      `ALTER TABLE "place" DROP CONSTRAINT "FK_5a9a0f535f8481c45d83c280296"`,
    )
    await queryRunner.query(`DROP TABLE "place_review_summary"`)
    await queryRunner.query(
      `DROP TYPE "public"."place_review_summary_source_enum"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ce74300098bd953d8cfa43039"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fafc9bfcfe7fd8a987dfd9b62e"`,
    )
    await queryRunner.query(`DROP TABLE "place_image"`)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4766078ad5ec0b75a4419f3531"`,
    )
    await queryRunner.query(`DROP TABLE "meeting_place_recommendation_vote"`)
    await queryRunner.query(
      `DROP TYPE "public"."meeting_place_recommendation_vote_preference_enum"`,
    )
    await queryRunner.query(`DROP TABLE "course_category_step"`)
    await queryRunner.query(`DROP TABLE "course_candidate_place"`)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6c603b1d8b2556de0e1e8a6112"`,
    )
    await queryRunner.query(`DROP TABLE "meeting_place_recommendation"`)
    await queryRunner.query(`DROP TABLE "course_candidate_comment"`)
    await queryRunner.query(`DROP TABLE "course_candidate"`)
    await queryRunner.query(`DROP TABLE "meeting_participant"`)
    await queryRunner.query(
      `DROP TYPE "public"."meeting_participant_role_enum"`,
    )
    await queryRunner.query(`DROP TABLE "meeting"`)
    await queryRunner.query(`DROP TABLE "meeting_type"`)
    await queryRunner.query(`DROP TABLE "place"`)
    await queryRunner.query(`DROP TYPE "public"."place_source_enum"`)
    await queryRunner.query(`DROP TABLE "user"`)
    await queryRunner.query(`DROP TABLE "media_asset"`)
    await queryRunner.query(`DROP TYPE "public"."media_asset_mime_type_enum"`)
    await queryRunner.query(`DROP TABLE "category"`)
  }
}
