import { ApiProperty } from '@nestjs/swagger'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { CourseCommentDto } from './course-comment.dto'

export class CourseCommentListResponseDto {
  @ApiProperty({
    description: '코스에 첨부된 댓글 목록',
    type: [CourseCommentDto],
  })
  comments!: CourseCommentDto[]

  @ApiProperty({
    description: '현재 요청자의 모임 내 역할',
    enum: ParticipantRole,
    enumName: 'ParticipantRole',
    example: ParticipantRole.Host,
  })
  viewerRole!: ParticipantRole
}
