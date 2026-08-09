import { ApiProperty } from '@nestjs/swagger'

export class AddCoursePlaceRequestDto {
  @ApiProperty({
    description: '코스에 추가할 장소 추천 ID.',
    example: '1',
    pattern: '^\\d+$',
  })
  recommendationId!: string
}
