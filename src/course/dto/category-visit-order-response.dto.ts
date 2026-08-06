import { ApiProperty } from '@nestjs/swagger'

export class CategoryVisitOrderResponseDto {
  @ApiProperty({ description: 'CourseCategoryStep의 ID', example: '1' })
  courseStepId: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category: string

  @ApiProperty({ description: '방문 순서', example: 1 })
  order: number
}
