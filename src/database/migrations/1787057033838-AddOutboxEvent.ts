import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOutboxEvent1787057033838 implements MigrationInterface {
  name = 'AddOutboxEvent1787057033838'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."outbox_event_status_enum" AS ENUM('PENDING', 'PROCESSED', 'FAILED', 'DEAD_LETTER')`,
    )
    await queryRunner.query(
      `CREATE TABLE "outbox_event" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "event_type" character varying NOT NULL, "aggregate_type" character varying NOT NULL, "aggregate_id" bigint NOT NULL, "payload" jsonb NOT NULL, "status" "public"."outbox_event_status_enum" NOT NULL DEFAULT 'PENDING', "attempt_count" integer NOT NULL DEFAULT '0', "error_message" text, "processed_at" TIMESTAMP, "next_retry_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_12eeb873f748d51454c447d975" CHECK ("next_retry_at" >= "created_at"), CONSTRAINT "CHK_d4115ff5cb282f9501d06da47b" CHECK ("status" NOT IN ('FAILED', 'DEAD_LETTER') OR "error_message" IS NOT NULL), CONSTRAINT "CHK_6b1fcf619f4c2a6005a526beb9" CHECK (("status" = 'PROCESSED') = ("processed_at" IS NOT NULL)), CONSTRAINT "CHK_9c3b02a1b7a8ce1d89f99a2fe2" CHECK (length("aggregate_type") >= 1), CONSTRAINT "CHK_fba4c1f9527adc849731916fe6" CHECK (length("event_type") >= 1), CONSTRAINT "CHK_a7fd97967d60b7f51beb5c5d06" CHECK ("aggregate_id" > 0), CONSTRAINT "CHK_7a2586e16f17ce743165a1dfa9" CHECK ("attempt_count" >= 0), CONSTRAINT "PK_cc0c9e40998e45ecfc5e313429d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_b164a78872812408b523fe826f" ON "outbox_event" ("status", "next_retry_at")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b164a78872812408b523fe826f"`,
    )
    await queryRunner.query(`DROP TABLE "outbox_event"`)
    await queryRunner.query(`DROP TYPE "public"."outbox_event_status_enum"`)
  }
}
