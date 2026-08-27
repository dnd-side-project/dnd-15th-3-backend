import { ApiProperty } from '@nestjs/swagger'
import { CourseRouteStepDto } from './course-route-step.dto'

export class CourseDetailResponseDto {
  @ApiProperty({ description: '코스 이름', example: '뚜벅이 최적 코스' })
  courseName!: string

  @ApiProperty({ description: '총 이동 거리(km)', example: 2.1 })
  totalDistanceKm!: number

  @ApiProperty({
    description: '코스를 구성하는 총 장소 개수',
    example: 4,
  })
  totalCount!: number

  @ApiProperty({
    description:
      '코스를 구성하는 장소 경로. 각 항목의 previewPhoto를 대표 사진으로 사용합니다.',
    type: [CourseRouteStepDto],
  })
  route!: CourseRouteStepDto[]
}
