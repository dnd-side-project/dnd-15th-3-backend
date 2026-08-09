import { ApiProperty } from '@nestjs/swagger'

export class AddRecommendationDto {
  @ApiProperty({ description: '추가할 장소 ID', example: '101' })
  placeId!: string
}
