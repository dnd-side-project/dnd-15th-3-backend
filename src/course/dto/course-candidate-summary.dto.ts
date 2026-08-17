import { ApiProperty } from '@nestjs/swagger'

export class CourseCandidateSummaryDto {
  @ApiProperty({
    description: '코스 후보 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  courseCandidateId!: string

  @ApiProperty({
    description: '코스 후보 순서',
    example: 1,
  })
  order!: number
}
