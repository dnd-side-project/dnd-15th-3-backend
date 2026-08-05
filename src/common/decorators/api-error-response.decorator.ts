import { ApiResponse } from '@nestjs/swagger'
import { ErrorCode } from '../exception/error-code.type'

// ErrorCode 하나로 status/code/message를 한 번에 문서화하는 헬퍼
export function ApiErrorResponse(errorCode: ErrorCode, description: string) {
  return ApiResponse({
    status: errorCode.status,
    description,
    schema: {
      example: { code: errorCode.code, message: errorCode.message },
    },
  })
}
