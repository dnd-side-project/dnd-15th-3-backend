import { ApiProperty } from '@nestjs/swagger'
import { ValidationErrorDetailDto } from './validation-error-detail.dto'

// 모든 에러 응답의 문서화 전용 스키마. 실제 응답은 GlobalExceptionFilter가 BaseException에서 값을 꺼내 만듦
export class ErrorResponseDto {
  @ApiProperty({
    description: '클라이언트에서 사용하는 에러 코드',
    example: 'COURSE_NOT_FOUND',
  })
  code: string

  @ApiProperty({
    description: '사용자에게 보여줄 에러 메시지',
    example: '코스를 찾을 수 없습니다.',
  })
  message: string

  @ApiProperty({
    description:
      '필드 유효성 검증 실패 시 필드별 상세 에러 목록. 검증 실패가 아니면 없음',
    required: false,
    type: [ValidationErrorDetailDto],
  })
  fieldErrors?: ValidationErrorDetailDto[]
}
