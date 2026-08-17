import { BaseException } from './base.exception'
import { ErrorCode } from './error-code.type'
import { ValidationErrorDetailDto } from './validation-error-detail.dto'

// 특정 도메인에 속하지 않는 인증·검증·외부 연동 실패를 표현한다.
export class CommonException extends BaseException {
  constructor(
    errorCode: ErrorCode,
    readonly fieldErrors?: ValidationErrorDetailDto[],
  ) {
    super(errorCode)
  }
}
