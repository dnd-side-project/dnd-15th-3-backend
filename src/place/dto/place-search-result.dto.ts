import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PlaceSource } from '../enums/place-source.enum'

export class PlaceSearchResultDto {
  @ApiProperty({ description: '장소 ID', example: '1', pattern: '^\\d+$' })
  placeId!: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category!: string

  @ApiProperty({
    description: '카테고리 슬러그',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
  })
  categorySlug!: CategorySlug

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({ description: '주소', example: '서울 성동구 성수이로 1' })
  address!: string

  @ApiProperty({
    description: '장소 사진 URL 목록. 표시 순서대로 정렬됩니다.',
    type: [String],
    example: ['https://...', 'https://...'],
  })
  imageUrls!: string[]

  @ApiProperty({
    description: '미리보기 사이트 링크',
    example: null,
    nullable: true,
  })
  previewUrl!: string | null

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

  @ApiProperty({ description: '위도', example: 37.5446 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0557 })
  longitude!: number
}
