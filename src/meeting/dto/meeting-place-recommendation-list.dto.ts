import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PlaceSortOption } from 'src/place/enums/place-sort-option.enum'
import { MeetingPlaceRecommendationDto } from './meeting-place-recommendation.dto'

export class MeetingPlaceRecommendationListDto {
  @ApiProperty({
    description: '추가된 장소 목록',
    type: [MeetingPlaceRecommendationDto],
  })
  items!: MeetingPlaceRecommendationDto[]

  @ApiProperty({
    description: '조회 조건에 해당하는 전체 장소 개수',
    example: 12,
  })
  totalCount!: number

  @ApiProperty({
    description: '실제 적용된 정렬 기준',
    enum: PlaceSortOption,
    example: PlaceSortOption.Recommended,
  })
  appliedSort!: PlaceSortOption

  @ApiProperty({
    description: '실제 적용된 카테고리 필터. 전체 조회면 null',
    enum: CategorySlug,
    example: CategorySlug.Cafe,
    nullable: true,
    required: false,
  })
  appliedCategory!: CategorySlug | null
}
