import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { ParticipantRequest } from '../auth/participant-context'

@Injectable()
export class HostGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ParticipantRequest>()
    const participant = request.participant

    if (!participant) {
      throw new UnauthorizedException('참여자 인증이 필요합니다.')
    }

    if (participant.role !== 'HOST') {
      throw new ForbiddenException('방장만 이 작업을 수행할 수 있습니다.')
    }

    return true
  }
}
