import { NotFoundException } from '@nestjs/common'
import { MockApiService } from 'src/mock/mock-api.service'
import { MeetingController } from './meeting.controller'

function createController(joinResult: unknown) {
  const mockApi = {
    requireEnabled: jest.fn(),
    joinMeeting: jest.fn().mockReturnValue(joinResult),
  } as unknown as MockApiService

  return { controller: new MeetingController(mockApi), mockApi }
}

describe('MeetingController', () => {
  it('passes the invitation token to the join service', () => {
    const { controller, mockApi } = createController({ id: '1' })
    const joinMeeting = controller.joinMeeting.bind(controller) as (dto: {
      accessToken: string
    }) => unknown

    joinMeeting({ accessToken: 'DNDFOR' })

    expect(mockApi.joinMeeting).toHaveBeenCalledWith('DNDFOR')
  })

  it('returns not found when the invitation token is invalid', () => {
    const { controller } = createController(undefined)
    const joinMeeting = controller.joinMeeting.bind(controller) as (dto: {
      accessToken: string
    }) => unknown

    expect(() => joinMeeting({ accessToken: 'INVALID' })).toThrow(
      NotFoundException,
    )
  })
})
