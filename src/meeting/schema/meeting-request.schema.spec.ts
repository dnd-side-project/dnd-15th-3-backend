import {
  invitationPreviewRequestSchema,
  joinMeetingRequestSchema,
} from './meeting-request.schema'

describe('meeting request schemas', () => {
  it('accepts invitationCode for invitation preview', () => {
    expect(
      invitationPreviewRequestSchema.parse({ invitationCode: 'DNDFOR' }),
    ).toEqual({ invitationCode: 'DNDFOR' })
  })

  it('does not accept accessToken as an invitation code', () => {
    expect(
      invitationPreviewRequestSchema.safeParse({ accessToken: 'DNDFOR' })
        .success,
    ).toBe(false)
  })

  it('accepts invitationCode with the participant profile for joining', () => {
    expect(
      joinMeetingRequestSchema.parse({
        invitationCode: 'DNDFOR',
        userKey: 'device-1',
        nickname: '모모',
        profileAvatarId: 'momo-blue',
      }),
    ).toMatchObject({ invitationCode: 'DNDFOR' })
  })
})
