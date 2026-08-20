import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDistanceToNextMetersToCourseCandidatePlace1786606074270
  implements MigrationInterface
{
  name = 'AddDistanceToNextMetersToCourseCandidatePlace1786606074270'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" ADD "distance_to_next_meters" integer`,
    )
    await queryRunner.query(
      `COMMENT ON COLUMN "course_candidate_place"."distance_to_next_meters" IS 'Unit: meter'`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" ADD CONSTRAINT "CHK_b3da128e4567e2c41f7822ba30" CHECK (("travel_time_to_next" IS NULL) = ("distance_to_next_meters" IS NULL))`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" ADD CONSTRAINT "CHK_aeb2ff53e21c55a33f446be00d" CHECK ("distance_to_next_meters" >= 0)`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" ADD CONSTRAINT "CHK_c227e797ca32a45d53ec6a86aa" CHECK ("travel_time_to_next" >= 0)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" DROP CONSTRAINT "CHK_c227e797ca32a45d53ec6a86aa"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" DROP CONSTRAINT "CHK_aeb2ff53e21c55a33f446be00d"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" DROP CONSTRAINT "CHK_b3da128e4567e2c41f7822ba30"`,
    )
    await queryRunner.query(
      `ALTER TABLE "course_candidate_place" DROP COLUMN "distance_to_next_meters"`,
    )
  }
}
