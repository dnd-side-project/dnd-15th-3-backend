import { ApiProperty } from '@nestjs/swagger'
import { PreferenceType } from 'src/course/enums/preference-type.enum'

export class PlacePreferenceResponseDto {
  @ApiProperty({ description: '좋아요 수', example: 6 })
  likeCount!: number

  @ApiProperty({ description: '싫어요 수', example: 2 })
  dislikeCount!: number

  @ApiProperty({
    description: '내 반응. null인 경우 좋아요 혹은 싫어요 상태가 아닌 상태',
    enum: PreferenceType,
    enumName: 'PreferenceType',
    example: PreferenceType.Like,
    nullable: true,
  })
  myPreference!: PreferenceType | null
}
