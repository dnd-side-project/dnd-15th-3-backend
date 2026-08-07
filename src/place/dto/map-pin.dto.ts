import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'

export class MapPinDto {
  @ApiProperty({ description: '장소 ID', example: '1', pattern: '^\\d+$' })
  placeId!: string

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category!: string

  @ApiProperty({
    description: '카테고리 슬러그',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
  })
  categorySlug!: CategorySlug

  @ApiProperty({ description: '경도', example: 128.753 })
  longitude!: number

  @ApiProperty({ description: '위도', example: 35.825 })
  latitude!: number
}
