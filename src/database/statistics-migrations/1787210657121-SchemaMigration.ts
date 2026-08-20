import { MigrationInterface, QueryRunner } from 'typeorm'

export class SchemaMigration1787210657121 implements MigrationInterface {
  name = 'SchemaMigration1787210657121'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "place_selection_fact" ("outbox_event_id" bigint NOT NULL, "place_id" bigint NOT NULL, "place_category_id" bigint NOT NULL, "meeting_id" bigint NOT NULL, "meeting_type_id" bigint NOT NULL, "meeting_date" date NOT NULL, "meeting_time" TIME(0) NOT NULL, "course_version" integer NOT NULL, "participant_count" integer NOT NULL, "like_count" integer NOT NULL, "dislike_count" integer NOT NULL, CONSTRAINT "CHK_e7abf106252c6c72b8e9fda4f9" CHECK ("like_count" + "dislike_count" <= "participant_count"), CONSTRAINT "CHK_f2a5102e425bce1d83b5d43549" CHECK ("dislike_count" >= 0), CONSTRAINT "CHK_c805f832ec2a45300acb12f41c" CHECK ("like_count" >= 0), CONSTRAINT "CHK_2a8eeb29962ede9762cc3d2cdb" CHECK ("participant_count" >= 1), CONSTRAINT "CHK_adebc0d9e351cac59108458f51" CHECK ("course_version" >= 1), CONSTRAINT "CHK_6d0ff499da447582d6af514655" CHECK ("meeting_type_id" > 0), CONSTRAINT "CHK_296b4c8ed70753e96a8966fb63" CHECK ("meeting_id" > 0), CONSTRAINT "CHK_f81d4ebf4442359a10ff7a6889" CHECK ("place_category_id" > 0), CONSTRAINT "CHK_92d65e895ba42dc16883edd74c" CHECK ("place_id" > 0), CONSTRAINT "CHK_02dccfa623adb8218b3568bca1" CHECK ("outbox_event_id" > 0), CONSTRAINT "PK_a2232fc058bc239fab60df359b5" PRIMARY KEY ("outbox_event_id", "place_id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_059f4e05072dee56d207894933" ON "place_selection_fact"  ("meeting_id", "course_version") `,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."place_tag_tag_code_enum" AS ENUM('HIGH_PREFERENCE', 'MEETING_PREFERRED', 'WEEKEND_PREFERRED', 'WEEKDAY_PREFERRED', 'FREQUENTLY_SELECTED', 'CATEGORY_POPULAR', 'SAFE_CHOICE')`,
    )
    await queryRunner.query(
      `CREATE TABLE "place_tag" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "place_id" bigint NOT NULL, "tag_code" "public"."place_tag_tag_code_enum" NOT NULL, CONSTRAINT "UQ_ec374dd9685031510878deecacf" UNIQUE ("place_id", "tag_code"), CONSTRAINT "CHK_336a2af6c43fbd5d5e971c7c28" CHECK ("place_id" > 0), CONSTRAINT "PK_8beff4b01da30a3701273e8ea7f" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "place_tag"`)
    await queryRunner.query(`DROP TYPE "public"."place_tag_tag_code_enum"`)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_059f4e05072dee56d207894933"`,
    )
    await queryRunner.query(`DROP TABLE "place_selection_fact"`)
  }
}
