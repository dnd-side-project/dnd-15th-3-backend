import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { MockApiService } from 'src/mock/mock-api.service'
import type {
  ParticipantContext,
  ParticipantRequest,
} from '../auth/participant-context'

function readBearerToken(
  authorization: string | string[] | undefined,
): string | undefined {
  if (typeof authorization !== 'string') return undefined

  const match = authorization.match(/^Bearer\s+([^\s]+)$/i)
  return match?.[1]
}

function readQueryToken(request: ParticipantRequest): string | undefined {
  const token = request.query?.accessToken
  return typeof token === 'string' ? token.trim() || undefined : undefined
}

@Injectable()
export class ParticipantAccessTokenGuard implements CanActivate {
  constructor(private readonly mockApi: MockApiService) {}

  canActivate(context: ExecutionContext): boolean {
    const isMockApiEnabled = this.mockApi.enabled
    this.mockApi.requireEnabled()

    const request = context.switchToHttp().getRequest<ParticipantRequest>()
    const authorization = request.headers.authorization
    const hasAuthorizationHeader = authorization !== undefined
    const accessToken = hasAuthorizationHeader
      ? readBearerToken(authorization)
      : isMockApiEnabled
        ? readQueryToken(request)
        : undefined

    if (!accessToken) {
      throw new UnauthorizedException(
        'Authorization Bearer 참여자 토큰이 필요합니다.',
      )
    }

    const session = this.mockApi.getParticipantSession(accessToken)
    if (!session) {
      throw new UnauthorizedException('유효하지 않은 참여자 토큰입니다.')
    }

    const participant: ParticipantContext = {
      participantId: session.participantId,
      role: session.role,
      accessToken,
    }
    request.participant = participant
    request.participantId = participant.participantId
    request.participantRole = participant.role
    request.role = participant.role
    request.participantAccessToken = participant.accessToken
    request.user = participant

    return true
  }
}
