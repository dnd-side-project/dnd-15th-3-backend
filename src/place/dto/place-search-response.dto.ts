import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PlaceSource } from '../enums/place-source.enum'
import { PlaceImageResponseDto } from './place-image-response.dto'

export class PlaceSearchCategoryResponseDto {
  @ApiProperty({ description: '카테고리 ID', example: '1' })
  id!: string

  @ApiProperty({ description: '카테고리명', example: '카페' })
  name!: string

  @ApiProperty({ description: '카테고리 슬러그', example: 'cafe' })
  slug!: string
}

export class PlaceSearchItemResponseDto {
  @ApiProperty({
    description: '내부 장소 ID. 추천 장소 추가 요청의 placeId로 사용합니다.',
    example: '101',
  })
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
    description:
      '대표 이미지 미리보기 URL. 프론트에서 직접 렌더링하며 이미지가 없으면 null입니다.',
    example: null,
    nullable: true,
  })
  previewUrl!: string | null

  @ApiProperty({
    description: '대표 이미지 렌더링 및 fallback·출처 표시에 필요한 메타데이터',
    type: PlaceImageResponseDto,
    nullable: true,
  })
  previewImage!: PlaceImageResponseDto | null

  @ApiProperty({ enum: PlaceSource, example: PlaceSource.Kakao })
  source!: PlaceSource

  @ApiProperty({
    description: '외부 장소 ID',
    nullable: true,
    example: '12345',
  })
  providerPlaceId!: string | null

  @ApiProperty({ description: '도로명 주소', nullable: true })
  roadAddress!: string | null

  @ApiProperty({ description: '전화번호', nullable: true })
  phone!: string | null

  @ApiProperty({ description: 'Kakao 장소 상세 URL', nullable: true })
  placeUrl!: string | null
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

  @ApiProperty({ enum: PlaceSource, example: PlaceSource.Kakao })
  source!: PlaceSource.Kakao

  @ApiProperty({
    description: '매 요청 시 Kakao에서 조회하는지 여부',
    example: true,
  })
  isLive!: true

  @ApiProperty({
    description: 'Kakao 검색을 지원하지 않는 카테고리',
    enum: CategorySlug,
    isArray: true,
    example: [CategorySlug.Other],
  })
  unsupportedCategorySlugs!: CategorySlug[]
}
