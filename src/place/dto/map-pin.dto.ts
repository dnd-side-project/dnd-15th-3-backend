import { ApiProperty } from '@nestjs/swagger'

export class MapPinDto {
  @ApiProperty({ description: '장소 ID', example: '1' })
  placeId!: string

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category!: string

  @ApiProperty({ description: '경도', example: 128.753 })
  x!: number

  @ApiProperty({ description: '위도', example: 35.825 })
  y!: number
}
