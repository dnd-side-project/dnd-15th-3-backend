import { ApiProperty } from '@nestjs/swagger'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'

export class MeetingParticipantResponseDto {
  @ApiProperty({ description: '참여자 ID', example: '12' })
  id!: string

  @ApiProperty({ description: '닉네임', example: '지니' })
  nickname!: string

  @ApiProperty({
    description: '역할',
    enum: ['HOST', 'MEMBER'],
    example: 'MEMBER',
  })
  role!: 'HOST' | 'MEMBER'

  @ApiProperty({
    description: '선택한 프로필 캐릭터 ID',
    enum: ProfileAvatarId,
    enumName: 'ProfileAvatarId',
    example: ProfileAvatarId.MomoYellow,
  })
  profileAvatarId!: ProfileAvatarId
}
