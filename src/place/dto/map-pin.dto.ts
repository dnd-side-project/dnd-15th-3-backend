import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'

export class MapPinDto {
  @ApiProperty({
    description: '장소 ID. 모임 시작지는 Place가 아니므로 없습니다.',
    example: '1',
    pattern: '^\\d+$',
    required: false,
  })
  placeId?: string

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({
    description: '카테고리 이름. 모임 시작지는 카테고리가 없습니다.',
    example: '카페',
    required: false,
  })
  category?: string

  @ApiProperty({
    description: '카테고리 슬러그. 모임 시작지는 카테고리가 없습니다.',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
    required: false,
  })
  categorySlug?: CategorySlug

  @ApiProperty({ description: '경도', example: 128.753 })
  longitude!: number

  @ApiProperty({ description: '위도', example: 35.825 })
  latitude!: number
}
