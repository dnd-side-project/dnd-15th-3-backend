import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches } from 'class-validator'
import {
  BIGINT_STRING_PATTERN,
  INVALID_FORMAT_REASON,
} from 'src/common/pipes/bigint-string.pipe'

export class AddCoursePlaceRequestDto {
  @ApiProperty({
    description: '코스에 추가할 장소 추천 ID.',
    example: '1',
    pattern: '^\\d+$',
  })
  @IsString()
  @Matches(BIGINT_STRING_PATTERN, { message: INVALID_FORMAT_REASON })
  recommendationId!: string
}
