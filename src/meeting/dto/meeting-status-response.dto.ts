import { ApiProperty } from '@nestjs/swagger'
import { MeetingStatus } from '../enums/meeting-status.enum'

export class MeetingStatusResponseDto {
  @ApiProperty({
    enum: MeetingStatus,
    example: MeetingStatus.CourseGenerating,
    description: '모임의 현재 상태',
  })
  status: MeetingStatus
}
