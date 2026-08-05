import type { Request } from 'express'

export type ParticipantRole = 'HOST' | 'MEMBER'

export type ParticipantContext = {
  participantId: string
  role: ParticipantRole
  accessToken: string
}

export type ParticipantRequest = Request & {
  participant?: ParticipantContext
  participantId?: string
  participantRole?: ParticipantRole
  role?: ParticipantRole
  participantAccessToken?: string
  user?: ParticipantContext
}
