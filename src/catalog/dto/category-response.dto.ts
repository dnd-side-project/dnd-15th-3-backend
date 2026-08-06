import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'

export class CategoryResponseDto {
  @ApiProperty({ description: '카테고리 ID', example: '1' })
  id!: string

  @ApiProperty({ description: '카테고리명', example: '카페' })
  name!: string

  @ApiProperty({
    description: 'URL·식별자에 사용할 카테고리 슬러그',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
  })
  slug!: CategorySlug
}
