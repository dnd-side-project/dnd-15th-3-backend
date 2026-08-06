import { ApiProperty } from '@nestjs/swagger'

export class InvitationPreviewRequestDto {
  @ApiProperty({
    description:
      '사용자가 입력한 6자리 초대 코드. 참여자 재접속 토큰과는 다른 값입니다.',
    example: 'DNDFOR',
    minLength: 6,
    maxLength: 6,
    pattern: '^[A-Z0-9]{6}$',
  })
  accessToken!: string
}
