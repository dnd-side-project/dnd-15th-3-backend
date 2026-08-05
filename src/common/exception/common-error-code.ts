import { HttpStatus } from '@nestjs/common'
import { ErrorCode } from './error-code.type'

// 특정 도메인에 속하지 않는 공통 에러 코드. 도인별 실패는 각 도메인의 ErrorCode에 정의
export const CommonErrorCode = {
  validationError: {
    code: 'VALIDATION_ERROR',
    status: HttpStatus.BAD_REQUEST,
    message: '입력값을 확인해주세요.',
  },
  internalServerError: {
    code: 'INTERNAL_SERVER_ERROR',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '서버 오류가 발생했습니다.',
  },
} as const satisfies Record<string, ErrorCode>
