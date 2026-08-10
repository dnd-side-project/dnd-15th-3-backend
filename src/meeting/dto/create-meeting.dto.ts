import { ApiProperty } from '@nestjs/swagger'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { MeetingLocationDto } from './meeting-location.dto'
import { ParticipantProfileDto } from './participant-profile.dto'

export class CreateMeetingDto {
  @ApiProperty({
    description: '모임 유형 코드',
    enum: MeetingTypeCode,
    enumName: 'MeetingTypeCode',
    example: MeetingTypeCode.Social,
  })
  meetingTypeCode!: MeetingTypeCode

  @ApiProperty({ description: '모임 이름', example: '성수 브런치 모임' })
  name!: string

  @ApiProperty({
    description: '모임 날짜(YYYY-MM-DD)',
    example: '2026-08-23',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  date!: string

  @ApiProperty({
    description: '모임 시간(HH:mm)',
    example: '12:00',
    pattern: '^\\d{2}:\\d{2}$',
  })
  time!: string

  @ApiProperty({
    description: '첫 만남 위치 검색 결과에서 선택한 위치',
    type: MeetingLocationDto,
  })
  firstMeetingLocation!: MeetingLocationDto

  @ApiProperty({
    description: '코스 카테고리 슬러그 목록. 배열 순서가 코스 진행 순서입니다.',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    isArray: true,
    minItems: 1,
    maxItems: MAX_COURSE_STEPS,
    example: [CategorySlug.Restaurant, CategorySlug.Cafe, CategorySlug.Bar],
  })
  categorySlugs!: CategorySlug[]

  @ApiProperty({ description: '방장 프로필', type: ParticipantProfileDto })
  host!: ParticipantProfileDto
}
