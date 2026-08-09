import { ApiProperty } from '@nestjs/swagger'
import { MeetingStatus } from '../enums/meeting-status.enum'

export class MeetingStatusResponseDto {
  @ApiProperty({
    enum: MeetingStatus,
    example: MeetingStatus.CourseGenerating,
    description: '모임의 현재 상태',
  })
  status!: MeetingStatus

  @ApiProperty({
    description: '확정된 코스 후보 ID. 확정 전이면 null',
    type: 'string',
    example: '5',
    pattern: '^\\d+$',
    nullable: true,
  })
  confirmedCourseCandidateId!: string | null
}
