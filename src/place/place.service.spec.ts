import { Category } from 'src/category/entities/category.entity'
import { CommonException } from 'src/common/exception/common.exception'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { KakaoImageSearchService } from 'src/kakao/kakao-image-search.service'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import type { Repository } from 'typeorm'
import { Place } from './entities/place.entity'
import { PlaceSource } from './enums/place-source.enum'
import { PlaceException } from './exception/place.exception'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlaceService } from './place.service'
import { PlaceImageService } from './place-image.service'
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
  const placeImageService = {
    getImageUrls: jest.fn().mockResolvedValue([]),
  }
  const kakaoImageSearchService = {
    findPreviewImages: jest.fn().mockResolvedValue(new Map()),
    findImages: jest.fn().mockResolvedValue([]),
  }

  return {
    service: new PlaceService(
      meetingLocationRepository as unknown as Repository<MeetingLocation>,
      participantRepository as unknown as Repository<MeetingParticipant>,
      placeRepository as unknown as Repository<Place>,
      categoryRepository as unknown as Repository<Category>,
      courseCategoryStepRepository as unknown as Repository<CourseCategoryStep>,
      placeLiveDataService as unknown as PlaceLiveDataService,
      placeImageService as unknown as PlaceImageService,
      kakaoImageSearchService as unknown as KakaoImageSearchService,
    ),
    meetingLocationRepository,
    participantRepository,
    placeRepository,
    categoryRepository,
    courseCategoryStepRepository,
    placeLiveDataService,
    placeImageService,
    kakaoImageSearchService,
  }
}

describe('PlaceService', () => {
  describe('searchPlaces', () => {
    it('기준 위치가 없으면 장소 저장소를 조회하지 않는다', async () => {
      const {
        service,
        participantRepository,
        placeLiveDataService,
        meetingLocationRepository,
      } = createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
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
        participantRepository,
        meetingLocationRepository,
        placeLiveDataService,
        courseCategoryStepRepository,
      } = createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
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
      )
    })

    it('현재 페이지 장소의 대표 이미지 URL과 fallback 메타데이터를 응답한다', async () => {
      const {
        service,
        participantRepository,
        placeLiveDataService,
        kakaoImageSearchService,
      } = createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })
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
      const previewImage = {
        url: 'https://images.example.com/place.jpg',
        thumbnailUrl: 'https://search.example.com/place-thumbnail.jpg',
        sourceName: '장소 블로그',
        sourceUrl: 'https://blog.example.com/place',
        width: 1280,
        height: 960,
      }
      kakaoImageSearchService.findPreviewImages.mockResolvedValue(
        new Map([['10', previewImage]]),
      )

      await expect(
        service.searchPlaces({
          meetingId: '123',
          accessToken: 'token',
          page: 1,
          size: 20,
        }),
      ).resolves.toMatchObject({
        items: [
          {
            id: '10',
            previewUrl: previewImage.thumbnailUrl,
            previewImage,
          },
        ],
      })
      expect(kakaoImageSearchService.findPreviewImages).toHaveBeenCalledWith([
        {
          id: '10',
          name: '성수 카페',
          address: '서울 성동구 성수동1가 1',
          roadAddress: '서울 성동구 성수이로 1',
        },
      ])
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

    it('이미지 URL 조회를 PlaceImageService에 위임하고 응답에 그대로 담는다', async () => {
      const {
        service,
        participantRepository,
        placeRepository,
        placeImageService,
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
          images: [
            {
              url: 'https://signed.example.com/first.jpg',
              thumbnailUrl: 'https://signed.example.com/first.jpg',
              sourceName: null,
              sourceUrl: null,
              width: null,
              height: null,
            },
            {
              url: 'https://signed.example.com/second.jpg',
              thumbnailUrl: 'https://signed.example.com/second.jpg',
              sourceName: null,
              sourceUrl: null,
              width: null,
              height: null,
            },
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
      placeImageService.getImageUrls.mockResolvedValue([])

      await expect(service.getPlaceDetail('1', 'token')).resolves.toMatchObject(
        { imageUrls: [], images: [], previewImage: null },
      )
    })

    it('Kakao 장소는 이미지 파일을 저장하지 않고 검색된 외부 URL을 응답한다', async () => {
      const {
        service,
        participantRepository,
        placeRepository,
        placeLiveDataService,
        placeImageService,
        kakaoImageSearchService,
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
        url: 'https://images.example.com/place.jpg',
        thumbnailUrl: 'https://search.example.com/place-thumbnail.jpg',
        sourceName: '장소 블로그',
        sourceUrl: 'https://blog.example.com/place',
        width: 1280,
        height: 960,
      }
      kakaoImageSearchService.findImages.mockResolvedValue([image])

      await expect(service.getPlaceDetail('1', 'token')).resolves.toMatchObject(
        {
          imageUrls: [image.url],
          images: [image],
          previewUrl: image.thumbnailUrl,
          previewImage: image,
        },
      )
      expect(kakaoImageSearchService.findImages).toHaveBeenCalledWith({
        name: '성수 카페',
        address: '서울 성동구 성수동1가 1',
        roadAddress: '서울 성동구 성수이로 1',
      })
      expect(placeImageService.getImageUrls).not.toHaveBeenCalled()
    })
  })
})
