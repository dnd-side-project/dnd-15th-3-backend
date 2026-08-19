import { HttpStatus } from '@nestjs/common'
import { ErrorCode } from './error-code.type'

// 특정 도메인에 속하지 않는 공통 에러 코드. 도인별 실패는 각 도메인의 ErrorCode에 정의
export const CommonErrorCode = {
  validationError: {
    code: 'VALIDATION_ERROR',
    status: HttpStatus.BAD_REQUEST,
    message: '입력값을 확인해주세요.',
  },
  authenticationFailed: {
    code: 'AUTHENTICATION_FAILED',
    status: HttpStatus.UNAUTHORIZED,
    message: '인증에 실패했습니다.',
  },
  accessDenied: {
    code: 'ACCESS_DENIED',
    status: HttpStatus.FORBIDDEN,
    message: '요청한 작업을 수행할 권한이 없습니다.',
  },
  resourceNotFound: {
    code: 'RESOURCE_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '요청한 리소스를 찾을 수 없습니다.',
  },
  conflict: {
    code: 'CONFLICT',
    status: HttpStatus.CONFLICT,
    message: '요청이 현재 상태와 충돌합니다.',
  },
  requestFailed: {
    code: 'REQUEST_FAILED',
    status: HttpStatus.BAD_REQUEST,
    message: '요청을 처리할 수 없습니다.',
  },
  notImplemented: {
    code: 'NOT_IMPLEMENTED',
    status: HttpStatus.NOT_IMPLEMENTED,
    message: '아직 제공되지 않는 기능입니다.',
  },
  externalServiceError: {
    code: 'EXTERNAL_SERVICE_ERROR',
    status: HttpStatus.BAD_GATEWAY,
    message: '외부 서비스 연동 중 오류가 발생했습니다.',
  },
  serviceUnavailable: {
    code: 'SERVICE_UNAVAILABLE',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: '서비스를 일시적으로 사용할 수 없습니다.',
  },
  internalServerError: {
    code: 'INTERNAL_SERVER_ERROR',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '서버 오류가 발생했습니다.',
  },
} as const satisfies Record<string, ErrorCode>
