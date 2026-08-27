import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PreferenceType } from 'src/course/enums/preference-type.enum'
import { PlacePhotoDto } from 'src/place/dto/place-photo.dto'

export class MeetingPlaceRecommendationDto {
  @ApiProperty({
    description: '장소 추천 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  recommendationId!: string

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
      '기존 클라이언트 호환용 대표 사진 URL. 신규 클라이언트는 previewPhoto를 사용합니다.',
    example: 'https://...',
    required: false,
    deprecated: true,
  })
  primaryImageUrl?: string

  @ApiProperty({
    description:
      '제외된 장소 대표 사진. source가 GOOGLE이면 attributions를 사진과 연결된 위치에 표시합니다.',
    type: PlacePhotoDto,
    nullable: true,
  })
  previewPhoto!: PlacePhotoDto | null

  @ApiProperty({ description: '좋아요 수', example: 2 })
  likeCount!: number

  @ApiProperty({ description: '싫어요 수', example: 0 })
  dislikeCount!: number

  @ApiProperty({
    description: '내 반응 null인 경우 좋아요 혹은 싫어요 상태가 아닌 상태',
    enum: PreferenceType,
    enumName: 'PreferenceType',
    example: PreferenceType.Like,
    nullable: true,
  })
  myPreference!: PreferenceType | null
}
