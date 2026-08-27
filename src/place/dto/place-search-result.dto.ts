import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PlaceSource } from '../enums/place-source.enum'
import { PlacePhotoDto } from './place-photo.dto'

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
    description:
      '기존 클라이언트 호환용 이미지 URL 목록. 신규 클라이언트는 photos를 사용합니다.',
    type: [String],
    example: ['https://...', 'https://...'],
    deprecated: true,
  })
  imageUrls!: string[]

  @ApiProperty({
    description:
      '장소 사진과 표시 의무 정보를 함께 담은 목록. 업체 매칭이 불확실하면 빈 배열입니다.',
    type: PlacePhotoDto,
    isArray: true,
  })
  photos!: PlacePhotoDto[]

  @ApiProperty({
    description:
      '기존 클라이언트 호환용 대표 이미지 URL. 신규 클라이언트는 previewPhoto를 사용합니다.',
    type: String,
    format: 'uri',
    example: null,
    nullable: true,
    deprecated: true,
  })
  previewUrl!: string | null

  @ApiProperty({
    description: '대표 사진 객체. 사진이 없으면 null입니다.',
    type: PlacePhotoDto,
    nullable: true,
  })
  previewPhoto!: PlacePhotoDto | null

  @ApiProperty({ enum: PlaceSource, example: PlaceSource.Kakao })
  source!: PlaceSource

  @ApiProperty({
    description: '외부 장소 ID',
    type: String,
    nullable: true,
    example: '12345',
  })
  providerPlaceId!: string | null

  @ApiProperty({ description: '도로명 주소', type: String, nullable: true })
  roadAddress!: string | null

  @ApiProperty({ description: '전화번호', type: String, nullable: true })
  phone!: string | null

  @ApiProperty({
    description: 'Kakao 장소 상세 URL',
    type: String,
    format: 'uri',
    nullable: true,
  })
  placeUrl!: string | null

  @ApiProperty({ description: '위도', example: 37.5446 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0557 })
  longitude!: number

  @ApiProperty({
    description: '이 모임에 이미 추천된 장소인지 여부',
    example: false,
  })
  isRecommended!: boolean
}
