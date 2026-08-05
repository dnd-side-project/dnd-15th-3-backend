import type { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { MockApiService } from './mock-api.service'

function createService(mockApiEnabled: boolean) {
  const config = {
    get: jest.fn().mockReturnValue(mockApiEnabled),
  } as unknown as ConfigService<Env, true>
  return new MockApiService(config)
}

describe('MockApiService', () => {
  it('returns role-specific screen data for participant access tokens', () => {
    const service = createService(true)

    expect(service.enabled).toBe(true)
    expect(service.getMeetingDetail('1', 'host-session-token')).toMatchObject({
      role: 'HOST',
      isHost: true,
      viewerParticipantId: '11',
      placeId: '101',
      permissions: expect.objectContaining({ canManageMeeting: true }),
      participants: expect.arrayContaining([
        expect.objectContaining({ role: 'HOST' }),
      ]),
      categorySteps: expect.arrayContaining([
        expect.objectContaining({ order: 1 }),
      ]),
    })

    expect(service.getMeetingDetail('1', 'member-session-token')).toMatchObject(
      {
        role: 'MEMBER',
        isHost: false,
        viewerParticipantId: '12',
        placeId: '101',
        permissions: expect.objectContaining({ canManageMeeting: false }),
      },
    )

    expect(service.getInvitationPreview('DNDFOR')).toMatchObject({
      meetingId: '1',
      accessToken: 'DNDFOR',
    })
  })

  it('filters places by keyword and category', () => {
    const service = createService(true)
    const searchPlaces = service.searchPlaces.bind(service) as (
      keyword: string,
      categoryId?: string,
    ) => Array<{ id: string }>

    expect(searchPlaces('카페').map(({ id }) => id)).toEqual(['301'])
    expect(searchPlaces('성수', '2').map(({ id }) => id)).toEqual(['302'])
    expect(searchPlaces('없는 장소')).toEqual([])
  })

  it('only joins a meeting with a valid invitation token', () => {
    const service = createService(true)
    const joinMeeting = service.joinMeeting.bind(service) as (
      accessToken: string,
    ) => { participantAccessToken: string } | undefined

    expect(joinMeeting('INVALID')).toBeUndefined()
    expect(joinMeeting('DNDFOR')).toMatchObject({
      participantAccessToken: 'member-session-token',
    })
  })

  it('does not expose fixtures unless mock mode is enabled', () => {
    const service = createService(false)

    expect(() => service.requireEnabled()).toThrow('MOCK_API_ENABLED=true')
  })
})
