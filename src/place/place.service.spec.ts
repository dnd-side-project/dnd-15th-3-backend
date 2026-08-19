import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import type { Repository } from 'typeorm'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlaceRepository } from './place.repository'
import { PlaceService } from './place.service'

function createService() {
  const meetingLocationRepository = {
    findOne: jest.fn(),
  }
  const participantRepository = {
    findOne: jest.fn(),
  }
  const placeRepository = {
    findNearby: jest.fn(),
  }
  const placeSyncService = {
    getStatus: jest.fn().mockResolvedValue({
      status: 'READY',
      lastSyncedAt: null,
    }),
  }

  return {
    service: new PlaceService(
      meetingLocationRepository as unknown as Repository<MeetingLocation>,
      participantRepository as never,
      placeRepository as unknown as PlaceRepository,
      placeSyncService as never,
    ),
    meetingLocationRepository,
    participantRepository,
    placeRepository,
    placeSyncService,
  }
}

describe('PlaceService', () => {
  it('기준 위치가 없으면 장소 저장소를 조회하지 않는다', async () => {
    const { service, participantRepository, placeRepository } = createService()
    participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })

    await expect(
      service.searchPlaces({
        meetingId: '123',
        accessToken: 'invalid',
        page: 1,
        size: 20,
      }),
    ).rejects.toMatchObject({
      errorCode: PlaceErrorCode.meetingLocationNotFound,
    })
    expect(placeRepository.findNearby).not.toHaveBeenCalled()
  })

  it('기준 좌표와 페이지 결과를 사용해 hasNext를 계산한다', async () => {
    const {
      service,
      participantRepository,
      meetingLocationRepository,
      placeRepository,
    } = createService()
    participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
    meetingLocationRepository.findOne.mockResolvedValue({
      latitude: 37.5,
      longitude: 127,
      syncVersion: 1,
    })
    placeRepository.findNearby.mockResolvedValue({
      items: [],
      total: 41,
    })

    await expect(
      service.searchPlaces({
        meetingId: '123',
        accessToken: 'token',
        page: 2,
        size: 20,
      }),
    ).resolves.toMatchObject({
      page: 2,
      size: 20,
      total: 41,
      hasNext: true,
    })
    expect(placeRepository.findNearby).toHaveBeenCalledWith(
      { meetingId: '123', accessToken: 'token', page: 2, size: 20 },
      37.5,
      127,
    )
  })
})
