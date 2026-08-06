import { ApiProperty } from '@nestjs/swagger'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'

export class ParticipantProfileDto {
  @ApiProperty({
    description: '클라이언트가 보관하는 익명 사용자 키',
    example: 'device-2d60e2dc',
  })
  userKey!: string

  @ApiProperty({ description: '모임에서 사용할 닉네임', example: '모모' })
  nickname!: string

  @ApiProperty({
    description: '선택한 프로필 캐릭터 ID',
    enum: ProfileAvatarId,
    enumName: 'ProfileAvatarId',
    example: ProfileAvatarId.MomoBlue,
  })
  profileAvatarId!: ProfileAvatarId
}
