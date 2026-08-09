import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingPlaceRecommendationDto } from 'src/meeting/dto/meeting-place-recommendation.dto'

export class ExcludedPlaceListResponseDto {
  @ApiProperty({
    description: '코스에서 제외된 장소 목록',
    type: [MeetingPlaceRecommendationDto],
  })
  items!: MeetingPlaceRecommendationDto[]

  @ApiProperty({
    description: '조회 조건에 해당하는 전체 장소 개수',
    example: 12,
  })
  totalCount!: number

  @ApiProperty({
    description: '실제 적용된 카테고리 필터. 전체 조회면 null',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
    nullable: true,
    required: false,
  })
  appliedCategory!: CategorySlug | null
}
