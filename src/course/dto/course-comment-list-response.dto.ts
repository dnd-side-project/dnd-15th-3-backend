import { ApiProperty } from '@nestjs/swagger'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
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

  @ApiProperty({ description: '현재 요청자 닉네임', example: '모모' })
  viewerNickname!: string

  @ApiProperty({
    description: '현재 요청자 프로필 캐릭터 ID',
    enum: ProfileAvatarId,
    enumName: 'ProfileAvatarId',
    example: ProfileAvatarId.MomoGreen,
  })
  viewerProfileAvatarId!: ProfileAvatarId
}
