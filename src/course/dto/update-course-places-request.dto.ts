import { ApiProperty } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsString,
  Matches,
} from 'class-validator'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import {
  BIGINT_STRING_PATTERN,
  INVALID_FORMAT_REASON,
} from 'src/common/pipes/bigint-string.pipe'

export class UpdateCoursePlacesRequestDto {
  @ApiProperty({
    description:
      '코스를 구성할 장소 추천 ID 전체 목록. 배열 순서가 그대로 방문 순서가 됩니다. ' +
      '일부만 보내는 것이 아니라 유지할 기존 장소를 포함한 전체 목록을 보내야 합니다.',
    type: 'string',
    isArray: true,
    minItems: 1,
    maxItems: MAX_COURSE_STEPS,
    uniqueItems: true,
    example: ['1', '2', '3'],
  })
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_COURSE_STEPS)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(BIGINT_STRING_PATTERN, {
    each: true,
    message: INVALID_FORMAT_REASON,
  })
  recommendationIds!: string[]
}
