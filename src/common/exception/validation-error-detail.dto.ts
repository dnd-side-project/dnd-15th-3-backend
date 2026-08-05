import { ApiProperty } from '@nestjs/swagger'

export class ValidationErrorDetailDto {
  @ApiProperty({ example: 'email' })
  field: string

  @ApiProperty({ example: '이메일 형식이 아닙니다.' })
  reason: string
}
