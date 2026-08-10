import { ApiProperty } from '@nestjs/swagger'

export class MeetingInvitationResponseDto {
  @ApiProperty({ description: '모임 ID', example: '1' })
  meetingId!: string

  @ApiProperty({ description: '초대 코드', example: 'DNDFOR' })
  invitationCode!: string

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

  @ApiProperty({ description: '모임의 첫 만남 위치 ID', example: '12' })
  locationId!: string
}
