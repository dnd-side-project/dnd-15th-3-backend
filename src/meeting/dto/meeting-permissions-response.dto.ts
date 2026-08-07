import { ApiProperty } from '@nestjs/swagger'

export class MeetingPermissionsResponseDto {
  @ApiProperty({
    description: '모임 설정을 변경할 수 있는지 여부',
    example: true,
  })
  canManageMeeting!: boolean

  @ApiProperty({
    description: '코스 후보를 확정할 수 있는지 여부',
    example: true,
  })
  canSelectCourse!: boolean

  @ApiProperty({
    description: '초대 코드를 확인·공유할 수 있는지 여부',
    example: true,
  })
  canShareInvitation!: boolean
}
