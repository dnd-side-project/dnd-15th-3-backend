import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PlaceSource } from '../enums/place-source.enum'
import { PlaceImageResponseDto } from './place-image-response.dto'

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
    description:
      '프론트 직접 렌더링, thumbnail fallback, 출처 표시에 필요한 장소 이미지 목록',
    type: PlaceImageResponseDto,
    isArray: true,
  })
  images!: PlaceImageResponseDto[]

  @ApiProperty({
    description:
      '대표 이미지 미리보기 URL. 프론트에서 직접 렌더링하며 이미지가 없으면 null입니다.',
    example: null,
    nullable: true,
  })
  previewUrl!: string | null

  @ApiProperty({
    description: '대표 이미지 메타데이터. 이미지가 없으면 null입니다.',
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

  @ApiProperty({ description: '위도', example: 37.5446 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0557 })
  longitude!: number
}
