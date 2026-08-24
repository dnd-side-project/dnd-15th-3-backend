import { Category } from 'src/category/entities/category.entity'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import type { MeetingAccessService } from 'src/meeting/access/meeting-access.service'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import type { Repository } from 'typeorm'
import { Place } from './entities/place.entity'
import { PlacePhotoSource } from './enums/place-photo-source.enum'
import { PlaceSource } from './enums/place-source.enum'
import { PlaceException } from './exception/place.exception'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlacePhotoService } from './photo/place-photo.service'
import { PlaceService } from './place.service'
import { PlaceLiveDataService } from './place-live-data.service'

function createService() {
  const meetingLocationRepository = {
    findOne: jest.fn().mockResolvedValue({ latitude: 37.5, longitude: 127 }),
  }
  const participantRepository = {
    findOne: jest.fn(),
  }
  const placeRepository = {
    findOne: jest.fn(),
  }
  const categoryRepository = {
    findOne: jest.fn(),
  }
  const courseCategoryStepRepository = {
    find: jest.fn().mockResolvedValue([]),
  }
  const placeLiveDataService = {
    searchKakao: jest.fn().mockResolvedValue({
      places: [],
      isComplete: true,
      unsupportedCategorySlugs: [],
    }),
    resolvePlace: jest.fn().mockImplementation((place) =>
      Promise.resolve({
        ...place,
        source: place.source ?? PlaceSource.Google,
        providerPlaceId: place.providerPlaceId ?? null,
        roadAddress: place.roadAddress ?? null,
        phone: place.phone ?? null,
        placeUrl: place.placeUrl ?? null,
        latitude: place.latitude ?? 37.5,
        longitude: place.longitude ?? 127,
      }),
    ),
  }
  const placePhotoService = {
    findPreviewPhotos: jest.fn().mockResolvedValue(new Map()),
    findPhotos: jest.fn().mockResolvedValue([]),
  }
  const meetingAccessService = {
    findParticipant: jest.fn(),
  }

  return {
    service: new PlaceService(
      meetingLocationRepository as unknown as Repository<MeetingLocation>,
      participantRepository as unknown as Repository<MeetingParticipant>,
      placeRepository as unknown as Repository<Place>,
      categoryRepository as unknown as Repository<Category>,
      courseCategoryStepRepository as unknown as Repository<CourseCategoryStep>,
      placeLiveDataService as unknown as PlaceLiveDataService,
      placePhotoService as unknown as PlacePhotoService,
      meetingAccessService as unknown as MeetingAccessService,
    ),
    meetingLocationRepository,
    participantRepository,
    placeRepository,
    categoryRepository,
    courseCategoryStepRepository,
    placeLiveDataService,
    placePhotoService,
    meetingAccessService,
  }
}

describe('PlaceService', () => {
  describe('searchPlaces', () => {
    it('기준 위치가 없으면 장소 저장소를 조회하지 않는다', async () => {
      const {
        service,
        placeLiveDataService,
        meetingLocationRepository,
        meetingAccessService,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'participant-1',
      })
      meetingLocationRepository.findOne.mockResolvedValue(null)

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
      expect(placeLiveDataService.searchKakao).not.toHaveBeenCalled()
    })

    it('기준 좌표와 페이지 결과를 사용해 hasNext를 계산한다', async () => {
      const {
        service,
        meetingLocationRepository,
        placeLiveDataService,
        courseCategoryStepRepository,
        meetingAccessService,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'participant-1',
      })
      meetingLocationRepository.findOne.mockResolvedValue({
        latitude: 37.5,
        longitude: 127,
        syncVersion: 1,
      })
      courseCategoryStepRepository.find.mockResolvedValue([
        { category: { id: '1', name: '카페', slug: 'cafe' } },
      ])
      placeLiveDataService.searchKakao.mockResolvedValue({
        places: Array.from({ length: 41 }, (_, index) => ({
          id: String(index + 1),
          name: `장소 ${index + 1}`,
          address: '주소',
          roadAddress: null,
          category: { id: '1', name: '카페', slug: 'cafe' },
          latitude: 37.5,
          longitude: 127,
          distanceMeters: index,
          previewUrl: null,
          source: PlaceSource.Kakao,
          providerPlaceId: String(index + 1),
          phone: null,
          placeUrl: null,
        })),
        isComplete: true,
        unsupportedCategorySlugs: [],
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
      expect(placeLiveDataService.searchKakao).toHaveBeenCalledWith(
        { latitude: 37.5, longitude: 127 },
        [{ id: '1', name: '카페', slug: 'cafe' }],
        undefined,
      )
    })

    it('검색어를 Kakao live 검색에 전달하고 Provider 결과를 그대로 페이지 처리한다', async () => {
      const {
        service,
        categoryRepository,
        placeLiveDataService,
        meetingAccessService,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'participant-1',
      })
      categoryRepository.findOne.mockResolvedValue({
        id: '1',
        name: '카페',
        slug: 'cafe',
      })
      placeLiveDataService.searchKakao.mockResolvedValue({
        places: [
          {
            id: '10',
            name: '카카오가 찾은 장소',
            address: '서울 성동구',
            roadAddress: null,
            category: { id: '1', name: '카페', slug: 'cafe' },
            latitude: 37.5,
            longitude: 127,
            distanceMeters: 100,
            previewUrl: null,
            source: PlaceSource.Kakao,
            providerPlaceId: '12345',
            phone: null,
            placeUrl: null,
          },
        ],
        isComplete: true,
        unsupportedCategorySlugs: [],
      })

      await expect(
        service.searchPlaces({
          meetingId: '123',
          accessToken: 'token',
          categorySlug: 'cafe' as never,
          q: '숨은카페',
          page: 1,
          size: 20,
        }),
      ).resolves.toMatchObject({
        total: 1,
        items: [{ id: '10', name: '카카오가 찾은 장소' }],
      })
      expect(placeLiveDataService.searchKakao).toHaveBeenCalledWith(
        { latitude: 37.5, longitude: 127 },
        [{ id: '1', name: '카페', slug: 'cafe' }],
        '숨은카페',
      )
    })

    it('현재 페이지 장소의 검증된 대표 사진을 구조화 응답과 기존 URL에 함께 담는다', async () => {
      const {
        service,
        placeLiveDataService,
        placePhotoService,
        meetingAccessService,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'participant-1',
      })
      placeLiveDataService.searchKakao.mockResolvedValue({
        places: [
          {
            id: '10',
            name: '성수 카페',
            address: '서울 성동구 성수동1가 1',
            roadAddress: '서울 성동구 성수이로 1',
            category: { id: '1', name: '카페', slug: 'cafe' },
            latitude: 37.5,
            longitude: 127,
            distanceMeters: 100,
            previewUrl: null,
            source: PlaceSource.Kakao,
            providerPlaceId: '12345',
            phone: null,
            placeUrl: 'https://place.map.kakao.com/12345',
          },
        ],
        isComplete: true,
        unsupportedCategorySlugs: [],
      })
      const previewUrl = 'https://search.example.com/place-thumbnail.jpg'
      const previewPhoto = {
        id: 'google:10:1',
        url: previewUrl,
        width: 800,
        height: 600,
        source: PlacePhotoSource.Google,
        attributions: [{ displayName: '사진가', uri: null, photoUri: null }],
        googleMapsUri: 'https://www.google.com/maps/place/photo-1',
        flagContentUri: null,
      }
      placePhotoService.findPreviewPhotos.mockResolvedValue(
        new Map([['10', previewPhoto]]),
      )

      const result = await service.searchPlaces({
        meetingId: '123',
        accessToken: 'token',
        page: 1,
        size: 20,
      })
      expect(result).toMatchObject({
        items: [
          {
            id: '10',
            previewUrl,
            previewPhoto,
          },
        ],
      })
      expect(placePhotoService.findPreviewPhotos).toHaveBeenCalledWith([
        expect.objectContaining({
          id: '10',
          name: '성수 카페',
          address: '서울 성동구 성수동1가 1',
          roadAddress: '서울 성동구 성수이로 1',
          providerPlaceId: '12345',
        }),
      ])
    })

    it('참여자를 찾지 못하면 401을 던지고 위치를 조회하지 않는다', async () => {
      const { service, meetingAccessService, meetingLocationRepository } =
        createService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new CommonException(CommonErrorCode.authenticationFailed),
      )

      await expect(
        service.searchPlaces({
          meetingId: '123',
          accessToken: 'invalid',
          page: 1,
          size: 20,
        }),
      ).rejects.toBeInstanceOf(CommonException)
      expect(meetingLocationRepository.findOne).not.toHaveBeenCalled()
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
      const {
        service,
        participantRepository,
        placeRepository,
        meetingLocationRepository,
      } = createService()
      participantRepository.findOne.mockResolvedValue({
        id: 'participant-1',
        meeting: { id: '123' },
      })
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
        relations: { meeting: true },
      })
      expect(meetingLocationRepository.findOne).toHaveBeenCalledWith({
        where: { meeting: { id: '123' } },
      })
    })

    it('장소를 찾을 수 없으면 404를 던진다', async () => {
      const { service, participantRepository, placeRepository } =
        createService()
      participantRepository.findOne.mockResolvedValue({
        id: 'participant-1',
        meeting: { id: '123' },
      })
      placeRepository.findOne.mockResolvedValue(null)

      await expect(
        service.getPlaceDetail('999', 'token'),
      ).rejects.toBeInstanceOf(PlaceException)
    })

    it('구조화 사진을 조회하고 기존 imageUrls·previewUrl도 함께 응답한다', async () => {
      const {
        service,
        participantRepository,
        placeRepository,
        placePhotoService,
      } = createService()
      participantRepository.findOne.mockResolvedValue({
        id: 'participant-1',
        meeting: { id: '123' },
      })
      placeRepository.findOne.mockResolvedValue({
        id: '1',
        name: '성수 카페 모모',
        address: '서울 성동구 성수이로 1',
        previewUrl: 'https://preview.example.com/1',
        category: { name: '카페', slug: 'cafe' },
      })
      const photos = [
        {
          id: 'owned:1:1',
          url: 'https://signed.example.com/first.jpg',
          width: null,
          height: null,
          source: PlacePhotoSource.Owned,
          attributions: [],
          googleMapsUri: null,
          flagContentUri: null,
        },
        {
          id: 'owned:1:2',
          url: 'https://signed.example.com/second.jpg',
          width: null,
          height: null,
          source: PlacePhotoSource.Owned,
          attributions: [],
          googleMapsUri: null,
          flagContentUri: null,
        },
      ]
      placePhotoService.findPhotos.mockResolvedValue(photos)

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
          photos,
          previewUrl: photos[0].url,
          previewPhoto: photos[0],
        },
      )
      expect(placePhotoService.findPhotos).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: '성수 카페 모모' }),
      )
    })

    it('이미지가 없으면 빈 배열을 그대로 응답한다', async () => {
      const {
        service,
        participantRepository,
        placeRepository,
        placePhotoService,
      } = createService()
      participantRepository.findOne.mockResolvedValue({
        id: 'participant-1',
        meeting: { id: '123' },
      })
      placeRepository.findOne.mockResolvedValue({
        id: '1',
        name: '성수 카페 모모',
        address: '서울 성동구 성수이로 1',
        previewUrl: 'https://preview.example.com/1',
        category: { name: '카페', slug: 'cafe' },
      })
      placePhotoService.findPhotos.mockResolvedValue([])

      const result = await service.getPlaceDetail('1', 'token')

      expect(result).toMatchObject({
        imageUrls: [],
        photos: [],
        previewUrl: null,
        previewPhoto: null,
      })
    })

    it('Kakao 장소도 업체가 검증된 Google 사진만 응답한다', async () => {
      const {
        service,
        participantRepository,
        placeRepository,
        placeLiveDataService,
        placePhotoService,
      } = createService()
      participantRepository.findOne.mockResolvedValue({
        id: 'participant-1',
        meeting: { id: '123' },
      })
      placeRepository.findOne.mockResolvedValue({
        id: '1',
        source: PlaceSource.Kakao,
        name: '12345',
        address: 'KAKAO_PLACE_REFERENCE',
        previewUrl: null,
        category: { name: '카페', slug: 'cafe' },
      })
      placeLiveDataService.resolvePlace.mockResolvedValue({
        id: '1',
        source: PlaceSource.Kakao,
        providerPlaceId: '12345',
        category: { name: '카페', slug: 'cafe' },
        name: '성수 카페',
        address: '서울 성동구 성수동1가 1',
        roadAddress: '서울 성동구 성수이로 1',
        latitude: 37.5,
        longitude: 127,
        phone: null,
        placeUrl: 'https://place.map.kakao.com/12345',
        previewUrl: null,
        distanceMeters: 100,
      })
      const image = {
        id: 'google:1:1',
        url: 'https://images.example.com/place.jpg',
        width: 1200,
        height: 900,
        source: PlacePhotoSource.Google,
        attributions: [{ displayName: '사진가', uri: null, photoUri: null }],
        googleMapsUri: 'https://www.google.com/maps/place/photo-1',
        flagContentUri: null,
      }
      placePhotoService.findPhotos.mockResolvedValue([image])

      const result = await service.getPlaceDetail('1', 'token')

      expect(result).toMatchObject({
        imageUrls: [image.url],
        photos: [image],
        previewUrl: image.url,
        previewPhoto: image,
      })
      expect(placePhotoService.findPhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          source: PlaceSource.Kakao,
          providerPlaceId: '12345',
          name: '성수 카페',
          address: '서울 성동구 성수동1가 1',
          roadAddress: '서울 성동구 성수이로 1',
        }),
      )
    })

    it('Kakao 이미지가 없으면 기존 필드에 빈 값만 응답한다', async () => {
      const {
        service,
        participantRepository,
        placeRepository,
        placeLiveDataService,
        placePhotoService,
      } = createService()
      participantRepository.findOne.mockResolvedValue({
        id: 'participant-1',
        meeting: { id: '123' },
      })
      placeRepository.findOne.mockResolvedValue({
        id: '1',
        source: PlaceSource.Kakao,
        name: '12345',
        address: 'KAKAO_PLACE_REFERENCE',
        previewUrl: null,
        category: { name: '카페', slug: 'cafe' },
      })
      placeLiveDataService.resolvePlace.mockResolvedValue({
        id: '1',
        source: PlaceSource.Kakao,
        providerPlaceId: '12345',
        category: { name: '카페', slug: 'cafe' },
        name: '성수 카페',
        address: '서울 성동구 성수동1가 1',
        roadAddress: '서울 성동구 성수이로 1',
        latitude: 37.5,
        longitude: 127,
        phone: null,
        placeUrl: 'https://place.map.kakao.com/12345',
        previewUrl: null,
        distanceMeters: 100,
      })

      const result = await service.getPlaceDetail('1', 'token')

      expect(result).toMatchObject({
        imageUrls: [],
        photos: [],
        previewUrl: null,
        previewPhoto: null,
      })
      expect(placePhotoService.findPhotos).toHaveBeenCalled()
    })
  })
})
