import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'

export class PlaceSearchResultDto {
  @ApiProperty({ description: '장소 ID', example: '1', pattern: '^\\d+$' })
  placeId!: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category!: string

  @ApiProperty({
    description: '카테고리 슬러그',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
  })
  categorySlug!: CategorySlug

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({ description: '주소', example: '서울 성동구 성수이로 1' })
  address!: string

  @ApiProperty({
    description: '대표 사진 URL',
    example: 'https://...',
    required: false,
  })
  primaryImageUrl?: string

  @ApiProperty({
    description: '장소의 전체 사진 목록',
    example: ['https://...', 'https://...'],
    required: false,
    type: [String],
  })
  imageUrls?: string[]

  @ApiProperty({
    description: '미리보기 사이트 링크',
    example: 'https://...',
    required: false,
  })
  previewUrl!: string
}
