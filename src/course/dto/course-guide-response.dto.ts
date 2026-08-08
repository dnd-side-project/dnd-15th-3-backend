import { ApiProperty } from '@nestjs/swagger'
import { CourseGuideRouteStepDto } from './course-guide-route-step.dto'

export class CourseGuideResponseDto {
  @ApiProperty({ description: '코스 이름', example: '뚜벅이 최적 코스' })
  courseName!: string

  @ApiProperty({ description: '총 이동 거리(km)', example: 2.1 })
  totalDistanceKm!: number

  @ApiProperty({ description: '방문 장소 개수', example: 4 })
  totalCount!: number

  @ApiProperty({
    description: '방문 순서대로 정렬된 장소 목록',
    type: [CourseGuideRouteStepDto],
  })
  route!: CourseGuideRouteStepDto[]
}
