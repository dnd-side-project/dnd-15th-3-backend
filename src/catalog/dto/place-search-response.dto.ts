import { ApiProperty } from '@nestjs/swagger'

export class PlaceSearchResponseDto {
  @ApiProperty({ description: '장소 ID', example: '101' })
  id!: string

  @ApiProperty({ description: '장소명', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({
    description: '도로명 또는 지번 주소',
    example: '서울 성동구 성수이로 1',
  })
  address!: string

  @ApiProperty({ description: '위도', example: 37.5446 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0557 })
  longitude!: number

  @ApiProperty({
    description: '대표 이미지 또는 미리보기 URL',
    example: 'https://...',
  })
  previewUrl!: string
}
