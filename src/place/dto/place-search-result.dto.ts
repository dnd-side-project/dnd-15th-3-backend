import { ApiProperty } from '@nestjs/swagger'

export class PlaceSearchResultDto {
  @ApiProperty({ description: '장소 ID', example: '1' })
  placeId!: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category!: string

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({ description: '주소', example: '서울 성동구 성수이로 1' })
  address!: string

  @ApiProperty({ description: '대표 사진 URL', example: 'https://...' })
  primaryImageUrl!: string

  @ApiProperty({
    description: '미리보기 사이트 링크',
    example: 'https://...',
    required: false,
  })
  previewUrl?: string
}
