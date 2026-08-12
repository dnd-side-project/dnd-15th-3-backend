import { UnauthorizedException } from '@nestjs/common'

export function assertAccessToken(accessToken: string): void {
  if (!accessToken?.trim()) {
    throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
  }
}
