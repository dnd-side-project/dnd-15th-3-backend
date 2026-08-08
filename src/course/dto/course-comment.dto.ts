import { ApiProperty } from '@nestjs/swagger'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'

export class CourseCommentDto {
  @ApiProperty({
    description: '댓글 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  commentId!: string

  @ApiProperty({ description: '작성자 닉네임', example: '모모' })
  nickname!: string

  @ApiProperty({
    description: '작성자 프로필 캐릭터 ID',
    enum: ProfileAvatarId,
    enumName: 'ProfileAvatarId',
    example: ProfileAvatarId.MomoBlue,
  })
  profileAvatarId!: ProfileAvatarId

  @ApiProperty({
    description: '작성자의 모임 내 역할',
    enum: ParticipantRole,
    enumName: 'ParticipantRole',
    example: ParticipantRole.Member,
  })
  authorRole!: ParticipantRole

  @ApiProperty({ description: '댓글 내용', example: '여기 코스 좋아요!' })
  content!: string

  @ApiProperty({
    description: '작성 시각',
    example: '2026-08-08T12:34:56.000Z',
  })
  createdAt!: string
}
