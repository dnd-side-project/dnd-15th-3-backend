import { ApiProperty } from '@nestjs/swagger'
import { CourseRouteStepDto } from './course-route-step.dto'

export class CourseDetailResponseDto {
  @ApiProperty({
    description: '코스를 구성하는 장소 경로',
    type: [CourseRouteStepDto],
  })
  route!: CourseRouteStepDto[]

  @ApiProperty({
    description: '코스를 구성하는 총 장소 개수',
    example: 4,
  })
  totalCount!: number
}
