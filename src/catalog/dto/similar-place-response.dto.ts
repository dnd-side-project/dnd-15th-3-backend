import { ApiProperty } from '@nestjs/swagger'

export class SimilarPlaceResponseDto {
  @ApiProperty({ description: '장소 ID', example: '101' })
  id!: string

  @ApiProperty({ description: '장소가 속한 카테고리 ID', example: '1' })
  categoryId!: string

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
    description: '대표 이미지 URL',
    type: 'string',
    example: 'https://...',
    nullable: true,
  })
  primaryImageUrl!: string | null

  @ApiProperty({
    description: '미리보기 URL. 아직 수집되지 않았다면 null입니다.',
    type: 'string',
    example: 'https://...',
    nullable: true,
  })
  previewUrl!: string | null

  @ApiProperty({
    description: 'Kakao 장소 상세 URL',
    type: 'string',
    nullable: true,
    required: false,
  })
  placeUrl?: string | null
}
