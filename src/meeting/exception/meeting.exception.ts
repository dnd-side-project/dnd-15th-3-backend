import { BaseException } from 'src/common/exception/base.exception'
import { ErrorCode } from 'src/common/exception/error-code.type'

// meeting 도메인이 던지는 유일한 예외. 개별 실패는 MeetingErrorCode로 구분
export class MeetingException extends BaseException {
  constructor(errorCode: ErrorCode) {
    super(errorCode)
  }
}
