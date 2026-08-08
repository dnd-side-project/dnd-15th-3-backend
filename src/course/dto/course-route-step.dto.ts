import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'

export class CourseRouteStepDto {
  @ApiProperty({
    description: '장소 추천 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  recommendationId!: string

  @ApiProperty({ description: '방문 순서', example: 1 })
  order!: number

  @ApiProperty({
    description:
      '카테고리 슬러그. 대표 사진이 없을 때 카테고리별 기본 이미지를 고르는 데 사용',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
  })
  categorySlug!: CategorySlug

  @ApiProperty({
    description: '대표 사진 URL. 없으면 카테고리별 기본 이미지를 사용',
    example: 'https://...',
    required: false,
  })
  primaryImageUrl?: string

  @ApiProperty({ description: '경도', example: 128.7514 })
  longitude!: number

  @ApiProperty({ description: '위도', example: 35.8242 })
  latitude!: number
}
