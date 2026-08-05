import { ApiProperty } from '@nestjs/swagger'

export class ValidationErrorDetailDto {
  @ApiProperty({ description: '검증에 실패한 필드명', example: 'email' })
  field: string

  @ApiProperty({
    description: '해당 필드가 검증에 실패한 이유',
    example: '이메일 형식이 아닙니다.',
  })
  reason: string
}
