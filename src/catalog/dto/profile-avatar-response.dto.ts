import { ApiProperty } from '@nestjs/swagger'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'

export class ProfileAvatarResponseDto {
  @ApiProperty({
    description: '캐릭터 식별자. 프론트엔드가 앱 내 이미지와 매핑합니다.',
    enum: ProfileAvatarId,
    enumName: 'ProfileAvatarId',
    example: ProfileAvatarId.MomoBlue,
  })
  id!: ProfileAvatarId

  @ApiProperty({ description: '캐릭터 이름', example: '파란 모모' })
  name!: string
}
