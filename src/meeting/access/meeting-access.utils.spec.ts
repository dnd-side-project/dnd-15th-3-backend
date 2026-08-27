import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { assertAccessToken } from './meeting-access.utils'

describe('assertAccessToken', () => {
  it.each([undefined, null, '', '   ', ['token-1', 'token-2'], {}])(
    '단일 비어 있지 않은 문자열이 아닌 토큰 %p를 거부한다',
    (accessToken) => {
      expect(() => assertAccessToken(accessToken)).toThrow(
        expect.objectContaining({
          errorCode: CommonErrorCode.authenticationFailed,
        }),
      )
    },
  )

  it('단일 비어 있지 않은 문자열 토큰을 허용한다', () => {
    expect(() => assertAccessToken('participant-token')).not.toThrow()
  })
})
