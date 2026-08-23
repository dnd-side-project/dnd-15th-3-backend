import { ApiProperty } from '@nestjs/swagger'

export class AddRecommendationDto {
  @ApiProperty({
    description: 'GET /places/search 응답의 items[].id',
    example: '101',
  })
  placeId!: string
}
