import { ApiProperty } from '@nestjs/swagger'

export class PlaceSearchCategoryResponseDto {
  @ApiProperty({ description: '카테고리 ID', example: '1' })
  id!: string

  @ApiProperty({ description: '카테고리명', example: '카페' })
  name!: string

  @ApiProperty({ description: '카테고리 슬러그', example: 'cafe' })
  slug!: string
}

export class PlaceSearchItemResponseDto {
  @ApiProperty({ description: '장소 ID', example: '101' })
  id!: string

  @ApiProperty({ description: '장소명', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({
    description: '도로명 또는 지번 주소',
    example: '서울 성동구 성수이로 1',
  })
  address!: string

  @ApiProperty({
    description: '장소 카테고리',
    type: PlaceSearchCategoryResponseDto,
  })
  category!: PlaceSearchCategoryResponseDto

  @ApiProperty({ description: '위도', example: 37.5446 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0557 })
  longitude!: number

  @ApiProperty({ description: '기준 위치로부터의 거리(미터)', example: 352.4 })
  distanceMeters!: number

  @ApiProperty({
    description: '대표 이미지 URL. 이미지 수집 전에는 null입니다.',
    example: null,
    nullable: true,
  })
  previewUrl!: string | null
}

export class PlaceSearchResponseDto {
  @ApiProperty({
    description: '반경 내 장소 목록',
    type: PlaceSearchItemResponseDto,
    isArray: true,
  })
  items!: PlaceSearchItemResponseDto[]

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page!: number

  @ApiProperty({ description: '페이지 크기', example: 20 })
  size!: number

  @ApiProperty({ description: '전체 장소 수', example: 42 })
  total!: number

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNext!: boolean

  @ApiProperty({
    description: '장소 수집 상태',
    enum: ['PENDING', 'RUNNING', 'READY', 'PARTIAL', 'FAILED'],
    example: 'READY',
  })
  collectionStatus!: 'PENDING' | 'RUNNING' | 'READY' | 'PARTIAL' | 'FAILED'

  @ApiProperty({
    description: '마지막으로 성공한 장소 수집 시각',
    nullable: true,
    type: String,
    example: null,
  })
  lastSyncedAt!: Date | null
}
