import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { MeetingStatus } from '../enums/meeting-status.enum'

export function assertAccessToken(accessToken: string): void {
  if (!accessToken?.trim()) {
    throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
  }
}

export function assertMeetingStatus(
  status: MeetingStatus,
  allowedStatuses: readonly MeetingStatus[],
  message: string,
): void {
  if (!allowedStatuses.includes(status)) {
    throw new ConflictException(message)
  }
}
