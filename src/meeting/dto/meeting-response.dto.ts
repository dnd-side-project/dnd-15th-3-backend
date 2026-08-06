import { ApiProperty } from '@nestjs/swagger'

export class MeetingResponseDto {
  @ApiProperty({ description: '모임 ID', example: '1' })
  id!: string

  @ApiProperty({ description: '모임 ID', example: '1', deprecated: true })
  meetingId!: string

  @ApiProperty({ description: '초대 코드', example: 'DNDFOR' })
  accessToken!: string

  @ApiProperty({
    description:
      '생성자/참여자에게 발급하는 참여자 전용 재접속 토큰. 초대 코드를 대신해 상세 조회에 사용합니다.',
    example: 'member-session-token',
  })
  participantAccessToken!: string

  @ApiProperty({
    description: '초대 링크',
    example: 'https://momo.example/invite/DNDFOR',
  })
  invitationUrl!: string

  @ApiProperty({ description: '모임 이름', example: '성수 브런치 모임' })
  name!: string

  @ApiProperty({ description: '모임 날짜', example: '2026-08-23' })
  date!: string

  @ApiProperty({ description: '모임 시간', example: '12:00' })
  time!: string
}
