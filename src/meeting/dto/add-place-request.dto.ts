import { ApiProperty } from '@nestjs/swagger'

export class AddPlaceRequestDto {
  @ApiProperty({
    description: '추가할 장소의 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  placeId!: string
}
