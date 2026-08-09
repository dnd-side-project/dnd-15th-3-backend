import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'

export class CourseRouteStepDto {
  @ApiProperty({
    description: '장소 추천 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  recommendationId!: string

  @ApiProperty({
    description: '장소 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  placeId!: string

  @ApiProperty({ description: '방문 순서', example: 1 })
  order!: number

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category!: string

  @ApiProperty({
    description:
      '카테고리 슬러그. 대표 사진이 없을 때 카테고리별 기본 이미지를 고르는 데 사용',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
  })
  categorySlug!: CategorySlug

  @ApiProperty({ description: '주소', example: '서울 성동구 성수이로 1' })
  address!: string

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

  @ApiProperty({
    description: '다음 장소까지 도보 이동 시간(분). 마지막 장소면 null',
    type: 'number',
    example: 8,
    nullable: true,
  })
  walkDurationToNextMin!: number | null
}
