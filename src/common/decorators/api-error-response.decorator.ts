import { applyDecorators } from '@nestjs/common'
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger'
import { ErrorCode } from '../exception/error-code.type'
import { ErrorResponseDto } from '../exception/error-response.dto'

// 같은 HTTP 상태의 여러 도메인 코드를 examples로 묶어 실제 응답 계약과 Swagger 문서를 일치시킨다.
export function ApiErrorResponse(
  errorCodeOrCodes: ErrorCode | readonly ErrorCode[],
  description: string,
) {
  const errorCodes = Array.isArray(errorCodeOrCodes)
    ? errorCodeOrCodes
    : [errorCodeOrCodes]
  const [firstErrorCode] = errorCodes

  if (!firstErrorCode) {
    throw new Error('ApiErrorResponse requires at least one error code')
  }
  if (errorCodes.some(({ status }) => status !== firstErrorCode.status)) {
    throw new Error(
      'ApiErrorResponse error codes must use the same HTTP status',
    )
  }

  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiResponse({
      status: firstErrorCode.status,
      description,
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(ErrorResponseDto) },
          examples: Object.fromEntries(
            errorCodes.map((errorCode) => [
              errorCode.code,
              {
                value: {
                  code: errorCode.code,
                  message: errorCode.message,
                },
              },
            ]),
          ),
        },
      },
    }),
  )
}
