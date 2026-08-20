import { BaseException } from 'src/common/exception/base.exception'
import type { ErrorCode } from 'src/common/exception/error-code.type'

export class CourseException extends BaseException {
  constructor(errorCode: ErrorCode) {
    super(errorCode)
  }
}
