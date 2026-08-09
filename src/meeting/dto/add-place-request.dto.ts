import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches } from 'class-validator'
import {
  BIGINT_STRING_PATTERN,
  INVALID_FORMAT_REASON,
} from 'src/common/pipes/bigint-string.pipe'

export class AddPlaceRequestDto {
  @ApiProperty({
    description: '추가할 장소의 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  @IsString()
  @Matches(BIGINT_STRING_PATTERN, { message: INVALID_FORMAT_REASON })
  placeId!: string
}
