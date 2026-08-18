import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'

export function assertAccessToken(accessToken: string): void {
  if (!accessToken?.trim()) {
    throw new CommonException(CommonErrorCode.authenticationFailed)
  }
}
