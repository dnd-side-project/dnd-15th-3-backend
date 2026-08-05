import { ErrorCode } from './error-code.type'

// 도메인 예외의 공통 상위 타입. 도메인은 이 클래스를 상속한 예외 하나만 두고, 개별 실패는 ErrorCode로 구분
export abstract class BaseException extends Error {
  protected constructor(readonly errorCode: ErrorCode) {
    super(errorCode.message)
  }
}
