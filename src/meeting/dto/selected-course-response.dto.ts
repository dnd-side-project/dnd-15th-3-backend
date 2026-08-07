import { ApiProperty } from '@nestjs/swagger'

export class SelectedCourseResponseDto {
  @ApiProperty({ description: '선정된 코스 후보 ID', example: '41' })
  id!: string

  @ApiProperty({
    description: '코스를 구성하는 추천 ID 목록. 배열 순서가 이동 순서입니다.',
    example: ['21', '22'],
  })
  recommendationIds!: string[]
}
