import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'

export function assertAccessToken(
  accessToken: unknown,
): asserts accessToken is string {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new CommonException(CommonErrorCode.authenticationFailed)
  }
}
