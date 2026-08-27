import { ApiProperty } from '@nestjs/swagger'
import { MeetingTypeCode } from '../enums/meeting-type-code.enum'
import { MeetingTypeSummaryDto } from './meeting-type-summary.dto'

export class MeetingDetailsResponseDto {
  @ApiProperty({ description: '모임 ID', example: '1' })
  meetingId!: string

  @ApiProperty({ description: '모임 이름', example: '성수 저녁 모임' })
  name!: string

  @ApiProperty({ description: '모임 날짜', example: '2026-09-10' })
  date!: string

  @ApiProperty({ description: '모임 시간(HH:mm)', example: '18:30' })
  time!: string

  @ApiProperty({
    description: '모임 유형 코드',
    enum: MeetingTypeCode,
    enumName: 'MeetingTypeCode',
    example: MeetingTypeCode.Social,
  })
  meetingTypeCode!: MeetingTypeCode

  @ApiProperty({ description: '모임 유형', type: MeetingTypeSummaryDto })
  meetingType!: MeetingTypeSummaryDto
}
