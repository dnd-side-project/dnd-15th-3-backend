import { ApiPropertyOptional } from '@nestjs/swagger'
import { MeetingTypeCode } from '../enums/meeting-type-code.enum'

export class UpdateMeetingDetailsDto {
  @ApiPropertyOptional({
    description: '변경할 모임 유형 코드',
    enum: MeetingTypeCode,
    enumName: 'MeetingTypeCode',
    example: MeetingTypeCode.Social,
  })
  meetingTypeCode?: MeetingTypeCode

  @ApiPropertyOptional({
    description: '변경할 모임 이름',
    example: '성수 저녁 모임',
  })
  name?: string

  @ApiPropertyOptional({
    description: '변경할 모임 날짜(YYYY-MM-DD)',
    example: '2026-09-10',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  date?: string

  @ApiPropertyOptional({
    description: '변경할 모임 시간(HH:mm)',
    example: '18:30',
    pattern: '^\\d{2}:\\d{2}$',
  })
  time?: string
}
