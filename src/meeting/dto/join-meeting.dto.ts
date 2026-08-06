import { ApiProperty } from '@nestjs/swagger'
import { ParticipantProfileDto } from './participant-profile.dto'

export class JoinMeetingDto extends ParticipantProfileDto {
  @ApiProperty({
    description: '초대 코드 6자리',
    example: 'DNDFOR',
    minLength: 6,
    maxLength: 6,
    pattern: '^[A-Z0-9]{6}$',
  })
  invitationCode!: string
}
