import { ApiProperty } from '@nestjs/swagger'
import { PreferenceType } from 'src/course/enums/preference-type.enum'

export class MeetingPlaceRecommendationDto {
  @ApiProperty({
    description: '장소 추천 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  recommendationId!: string

  @ApiProperty({ description: '카테고리 이름', example: '카페' })
  category!: string

  @ApiProperty({ description: '장소 이름', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({ description: '주소', example: '서울 성동구 성수이로 1' })
  address!: string

  @ApiProperty({
    description: '대표 사진 URL',
    example: 'https://...',
    required: false,
  })
  primaryImageUrl?: string

  @ApiProperty({ description: '좋아요 수', example: 2 })
  likeCount!: number

  @ApiProperty({ description: '싫어요 수', example: 0 })
  dislikeCount!: number

  @ApiProperty({
    description: '내 반응 null인 경우 좋아요 혹은 싫어요 상태가 아닌 상태',
    enum: PreferenceType,
    example: PreferenceType.Like,
    nullable: true,
  })
  myPreference!: PreferenceType | null
}
