import { ApiProperty } from '@nestjs/swagger'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'

export class MeetingTypeResponseDto {
  @ApiProperty({ description: '모임 유형 ID', example: '1' })
  id!: string

  @ApiProperty({
    description: '모임 유형 코드',
    enum: MeetingTypeCode,
    enumName: 'MeetingTypeCode',
    example: MeetingTypeCode.Social,
  })
  code!: MeetingTypeCode

  @ApiProperty({
    description: '화면에 표시할 모임 유형명',
    example: '친목',
  })
  name!: string
}
