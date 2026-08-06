import { ApiProperty } from '@nestjs/swagger'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CourseCategoryStepResponseDto } from './course-category-step-response.dto'

export class CoursePlanResponseDto {
  @ApiProperty({ description: '모임 ID', example: '1' })
  meetingId!: string

  @ApiProperty({
    description: '허용되는 최대 코스 수',
    example: MAX_COURSE_STEPS,
  })
  maxSteps!: number

  @ApiProperty({ description: '현재 코스 버전', example: 1 })
  version!: number

  @ApiProperty({
    description: '현재 선택된 코스 카테고리와 순서',
    type: CourseCategoryStepResponseDto,
    isArray: true,
  })
  categorySteps!: CourseCategoryStepResponseDto[]
}
