import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PlacePhotoDto } from 'src/place/dto/place-photo.dto'
import { PlaceSummaryDto } from './place-summary.dto'

export class RecommendationPreviewDto {
  @ApiProperty({ description: '추천 ID', example: '21' })
  id!: string

  @ApiProperty({ description: '카테고리 ID', example: '1' })
  categoryId!: string

  @ApiProperty({ description: '추천 장소', type: PlaceSummaryDto })
  place!: PlaceSummaryDto

  @ApiProperty({
    description:
      '추천 장소 대표 사진. source가 GOOGLE이면 attributions를 사진과 연결된 위치에 표시합니다.',
    type: PlacePhotoDto,
    nullable: true,
  })
  previewPhoto!: PlacePhotoDto | null

  @ApiProperty({ description: '추천자 참여자 ID', example: '11' })
  recommendedByParticipantId!: string

  @ApiProperty({ description: '좋아요 수', example: 2 })
  likeCount!: number

  @ApiProperty({ description: '싫어요 수', example: 0 })
  dislikeCount!: number

  @ApiPropertyOptional({
    description: '현재 사용자의 선택',
    enum: ['LIKE', 'DISLIKE'],
    nullable: true,
    example: 'LIKE',
  })
  viewerPreference!: 'LIKE' | 'DISLIKE' | null
}
