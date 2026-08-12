import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common'
import { MeetingStatus } from '../enums/meeting-status.enum'
import { ParticipantRole } from '../enums/participant-role.enum'

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

export function assertHost(role: ParticipantRole, message: string): void {
  if (role !== ParticipantRole.Host) {
    throw new ForbiddenException(message)
  }
}
