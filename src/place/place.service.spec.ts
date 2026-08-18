import { CommonException } from 'src/common/exception/common.exception'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import type { Repository } from 'typeorm'
import { Place } from './entities/place.entity'
import { PlaceException } from './exception/place.exception'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlaceRepository } from './place.repository'
import { PlaceService } from './place.service'
import { PlaceImageService } from './place-image.service'

function createService() {
  const meetingLocationRepository = {
    findOne: jest.fn(),
  }
  const participantRepository = {
    findOne: jest.fn(),
  }
  const placeRepository = {
    findOne: jest.fn(),
  }
  const placeSearchRepository = {
    findNearby: jest.fn(),
  }
  const placeSyncService = {
    getStatus: jest.fn().mockResolvedValue({
      status: 'READY',
      lastSyncedAt: null,
    }),
  }
  const placeImageService = {
    getImageUrls: jest.fn().mockResolvedValue([]),
  }

  return {
    service: new PlaceService(
      meetingLocationRepository as unknown as Repository<MeetingLocation>,
      participantRepository as unknown as Repository<MeetingParticipant>,
      placeRepository as unknown as Repository<Place>,
      placeSearchRepository as unknown as PlaceRepository,
      placeSyncService as never,
      placeImageService as unknown as PlaceImageService,
    ),
    meetingLocationRepository,
    participantRepository,
    placeRepository,
    placeSearchRepository,
    placeSyncService,
    placeImageService,
  }
}

describe('PlaceService', () => {
  describe('searchPlaces', () => {
    it('기준 위치가 없으면 장소 저장소를 조회하지 않는다', async () => {
      const { service, participantRepository, placeSearchRepository } =
        createService()
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
      expect(placeSearchRepository.findNearby).not.toHaveBeenCalled()
    })

    it('기준 좌표와 페이지 결과를 사용해 hasNext를 계산한다', async () => {
      const {
        service,
        participantRepository,
        meetingLocationRepository,
        placeSearchRepository,
      } = createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
      meetingLocationRepository.findOne.mockResolvedValue({
        latitude: 37.5,
        longitude: 127,
        syncVersion: 1,
      })
      placeSearchRepository.findNearby.mockResolvedValue({
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
      expect(placeSearchRepository.findNearby).toHaveBeenCalledWith(
        { meetingId: '123', accessToken: 'token', page: 2, size: 20 },
        37.5,
        127,
      )
    })
  })

  describe('getPlaceDetail', () => {
    it('accessToken이 비어있으면 참여자 저장소를 조회하지 않고 401을 던진다', async () => {
      const { service, participantRepository } = createService()

      await expect(service.getPlaceDetail('1', '')).rejects.toBeInstanceOf(
        CommonException,
      )
      expect(participantRepository.findOne).not.toHaveBeenCalled()
    })

    it('참여자 토큰이 유효하지 않으면 장소를 조회하지 않는다', async () => {
      const { service, participantRepository, placeRepository } =
        createService()
      participantRepository.findOne.mockResolvedValue(null)

      await expect(
        service.getPlaceDetail('1', 'invalid-token'),
      ).rejects.toBeInstanceOf(CommonException)
      expect(placeRepository.findOne).not.toHaveBeenCalled()
    })

    it('accessToken 앞뒤 공백을 제거한 값으로 참여자를 조회한다', async () => {
      const { service, participantRepository, placeRepository } =
        createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
      placeRepository.findOne.mockResolvedValue({
        id: '1',
        name: '성수 카페 모모',
        address: '서울 성동구 성수이로 1',
        previewUrl: 'https://preview.example.com/1',
        category: { name: '카페', slug: 'cafe' },
      })

      await service.getPlaceDetail('1', '  token  ')

      expect(participantRepository.findOne).toHaveBeenCalledWith({
        where: { accessToken: 'token' },
      })
    })

    it('장소를 찾을 수 없으면 404를 던진다', async () => {
      const { service, participantRepository, placeRepository } =
        createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
      placeRepository.findOne.mockResolvedValue(null)

      await expect(
        service.getPlaceDetail('999', 'token'),
      ).rejects.toBeInstanceOf(PlaceException)
    })

    it('이미지 URL 조회를 PlaceImageService에 위임하고 응답에 그대로 담는다', async () => {
      const {
        service,
        participantRepository,
        placeRepository,
        placeImageService,
      } = createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
      placeRepository.findOne.mockResolvedValue({
        id: '1',
        name: '성수 카페 모모',
        address: '서울 성동구 성수이로 1',
        previewUrl: 'https://preview.example.com/1',
        category: { name: '카페', slug: 'cafe' },
      })
      placeImageService.getImageUrls.mockResolvedValue([
        'https://signed.example.com/first.jpg',
        'https://signed.example.com/second.jpg',
      ])

      await expect(service.getPlaceDetail('1', 'token')).resolves.toMatchObject(
        {
          placeId: '1',
          category: '카페',
          categorySlug: 'cafe',
          name: '성수 카페 모모',
          address: '서울 성동구 성수이로 1',
          imageUrls: [
            'https://signed.example.com/first.jpg',
            'https://signed.example.com/second.jpg',
          ],
          previewUrl: 'https://preview.example.com/1',
        },
      )
      expect(placeImageService.getImageUrls).toHaveBeenCalledWith('1')
    })

    it('이미지가 없으면 빈 배열을 그대로 응답한다', async () => {
      const {
        service,
        participantRepository,
        placeRepository,
        placeImageService,
      } = createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
      placeRepository.findOne.mockResolvedValue({
        id: '1',
        name: '성수 카페 모모',
        address: '서울 성동구 성수이로 1',
        previewUrl: 'https://preview.example.com/1',
        category: { name: '카페', slug: 'cafe' },
      })
      placeImageService.getImageUrls.mockResolvedValue([])

      await expect(service.getPlaceDetail('1', 'token')).resolves.toMatchObject(
        { imageUrls: [] },
      )
    })
  })
})
