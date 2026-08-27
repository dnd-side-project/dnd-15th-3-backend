import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PlacePhotoDto } from 'src/place/dto/place-photo.dto'
import { PlaceSource } from 'src/place/enums/place-source.enum'

export class CourseRouteStepDto {
  @ApiProperty({
    description: '장소 추천 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  recommendationId!: string

  @ApiProperty({
    description: '장소 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  placeId!: string

  @ApiProperty({ description: '방문 순서', example: 1 })
  order!: number

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category!: string

  @ApiProperty({
    description:
      '카테고리 슬러그. 대표 사진이 없을 때 카테고리별 기본 이미지를 고르는 데 사용',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
  })
  categorySlug!: CategorySlug

  @ApiProperty({ description: '주소', example: '서울 성동구 성수이로 1' })
  address!: string

  @ApiProperty({
    description:
      '기존 클라이언트 호환용 대표 사진 URL. 신규 클라이언트는 previewPhoto를 사용합니다.',
    type: 'string',
    example: 'https://...',
    nullable: true,
    deprecated: true,
  })
  primaryImageUrl!: string | null

  @ApiProperty({
    description:
      '코스 장소 대표 사진. source가 GOOGLE이면 attributions를 사진과 연결된 위치에 표시합니다.',
    type: PlacePhotoDto,
    nullable: true,
  })
  previewPhoto!: PlacePhotoDto | null

  @ApiProperty({ description: '경도', example: 128.7514 })
  longitude!: number

  @ApiProperty({ description: '위도', example: 35.8242 })
  latitude!: number

  @ApiProperty({
    description: '다음 장소까지 도보 이동 시간(분). 마지막 장소면 null',
    type: 'number',
    example: 8,
    nullable: true,
  })
  walkDurationToNextMin!: number | null

  @ApiProperty({ enum: PlaceSource, example: PlaceSource.Kakao })
  source!: PlaceSource

  @ApiProperty({ description: '외부 장소 ID', nullable: true })
  providerPlaceId!: string | null

  @ApiProperty({ description: '외부 장소 상세 URL', nullable: true })
  placeUrl!: string | null
}
