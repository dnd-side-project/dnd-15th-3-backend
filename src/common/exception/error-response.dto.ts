import { ApiProperty } from '@nestjs/swagger'
import { ValidationErrorDetailDto } from './validation-error-detail.dto'

// 모든 에러 응답의 문서화 전용 스키마. 실제 응답은 GlobalExceptionFilter가 BaseException에서 값을 꺼내 만듦
export class ErrorResponseDto {
  @ApiProperty({ example: 'COURSE_NOT_FOUND' })
  code: string

  @ApiProperty({ example: '코스를 찾을 수 없습니다.' })
  message: string

  @ApiProperty({ required: false, type: [ValidationErrorDetailDto] })
  fieldErrors?: ValidationErrorDetailDto[]
}
