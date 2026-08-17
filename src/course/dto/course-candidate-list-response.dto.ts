import { ApiProperty } from '@nestjs/swagger'
import { CourseCandidateSummaryDto } from './course-candidate-summary.dto'

export class CourseCandidateListResponseDto {
  @ApiProperty({
    description: '생성된 코스 후보 목록',
    type: [CourseCandidateSummaryDto],
  })
  courseCandidates!: CourseCandidateSummaryDto[]

  @ApiProperty({
    description: '생성된 코스 후보 총 개수',
    example: 2,
  })
  totalCount!: number
}
