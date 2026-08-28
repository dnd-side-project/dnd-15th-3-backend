import type { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import { PlaceSource } from '../enums/place-source.enum'
import type { PlaceImageService } from '../place-image.service'
import type { KakaoImagePhotoProvider } from './kakao-image-photo.provider'
import { PlacePhotoService } from './place-photo.service'
import type { PlacePhoto, PlacePhotoTarget } from './place-photo.types'
import type { TourPlacePhotoProvider } from './tour-place-photo.provider'

const target: PlacePhotoTarget = {
  id: '1',
  source: PlaceSource.Kakao,
  providerPlaceId: 'kakao-1',
  name: '나의가야',
  address: '서울 강남구 삼성동 159-7',
  roadAddress: '서울 강남구 역삼로69길 5',
  latitude: 37.508,
  longitude: 127.05,
  phone: null,
}

const tourPhoto = {
  id: 'tour:1:1',
  url: 'https://tong.visitkorea.or.kr/photo.jpg',
  width: null,
  height: null,
  source: PlacePhotoSource.Tour,
  attributions: [
    {
      displayName: '한국관광공사 · 공공누리 제1유형',
      uri: 'https://www.data.go.kr/data/15101578/openapi.do',
      photoUri: null,
    },
  ],
  googleMapsUri: null,
  flagContentUri: null,
}

const ownedPhoto: PlacePhoto = {
  id: 'owned:1:1',
  url: 'https://media.example.com/place-1.jpg',
  width: null,
  height: null,
  source: PlacePhotoSource.Owned,
  attributions: [],
  googleMapsUri: null,
  flagContentUri: null,
}

const kakaoPhoto = {
  id: 'kakao-image:1:1',
  url: 'https://example.com/photo.jpg',
  width: 1200,
  height: 900,
  source: PlacePhotoSource.Kakao,
  attributions: [
    {
      displayName: '출처 사이트',
      uri: 'https://example.com/post',
      photoUri: null,
    },
  ],
  googleMapsUri: null,
  flagContentUri: null,
}

function createService() {
  const placeImageService = {
    getPrimaryPhotos: jest.fn().mockResolvedValue(new Map()),
    getPhotos: jest.fn().mockResolvedValue([]),
    cacheTourPhotos: jest
      .fn()
      .mockImplementation((_placeId: string, photos: PlacePhoto[]) => photos),
  }
  const tourPhotoProvider = {
    isConfigured: jest.fn().mockReturnValue(true),
    findPhotos: jest.fn().mockResolvedValue([]),
  }
  const kakaoImagePhotoProvider = {
    isConfigured: jest.fn().mockReturnValue(true),
    findPhotos: jest.fn().mockResolvedValue([]),
  }
  const config = { get: jest.fn().mockReturnValue(10) }

  return {
    service: new PlacePhotoService(
      placeImageService as unknown as PlaceImageService,
      tourPhotoProvider as unknown as TourPlacePhotoProvider,
      kakaoImagePhotoProvider as unknown as KakaoImagePhotoProvider,
      config as unknown as ConfigService<Env, true>,
    ),
    placeImageService,
    tourPhotoProvider,
    kakaoImagePhotoProvider,
    config,
  }
}

describe('PlacePhotoService', () => {
  it('직접 소유한 사진을 외부 제공자보다 우선한다', async () => {
    const {
      service,
      placeImageService,
      tourPhotoProvider,
      kakaoImagePhotoProvider,
    } = createService()
    placeImageService.getPrimaryPhotos.mockResolvedValue(
      new Map([['1', ownedPhoto]]),
    )

    const result = await service.findPreviewPhotos([target])

    expect(result.get('1')).toMatchObject({
      url: 'https://media.example.com/place-1.jpg',
      source: PlacePhotoSource.Owned,
    })
    expect(tourPhotoProvider.findPhotos).not.toHaveBeenCalled()
    expect(kakaoImagePhotoProvider.findPhotos).not.toHaveBeenCalled()
  })

  it('TourAPI 사진을 Kakao보다 우선한다', async () => {
    const {
      service,
      placeImageService,
      tourPhotoProvider,
      kakaoImagePhotoProvider,
    } = createService()
    tourPhotoProvider.findPhotos.mockResolvedValue([tourPhoto])

    await expect(service.findPhotos(target)).resolves.toEqual([tourPhoto])
    expect(placeImageService.cacheTourPhotos).toHaveBeenCalledWith('1', [
      tourPhoto,
    ])
    expect(kakaoImagePhotoProvider.findPhotos).not.toHaveBeenCalled()
  })

  it('TourAPI 사진 캐시에 실패하면 원본 URL을 반환한다', async () => {
    const { service, placeImageService, tourPhotoProvider } = createService()
    tourPhotoProvider.findPhotos.mockResolvedValue([tourPhoto])
    placeImageService.cacheTourPhotos.mockRejectedValue(new Error('conflict'))

    await expect(service.findPhotos(target)).resolves.toEqual([tourPhoto])
  })

  it('TourAPI 사진이 없으면 Kakao 이미지 검색을 사용한다', async () => {
    const { service, kakaoImagePhotoProvider } = createService()
    kakaoImagePhotoProvider.findPhotos.mockResolvedValue([kakaoPhoto])

    await expect(service.findPhotos(target)).resolves.toEqual([kakaoPhoto])
  })

  it('무료 제공자가 실패해도 장소 응답을 깨뜨리지 않는다', async () => {
    const { service, tourPhotoProvider, kakaoImagePhotoProvider } =
      createService()
    tourPhotoProvider.findPhotos.mockRejectedValue(new Error('unavailable'))
    kakaoImagePhotoProvider.findPhotos.mockRejectedValue(
      new Error('unavailable'),
    )

    await expect(service.findPhotos(target)).resolves.toEqual([])
  })

  it('설정된 동시성만큼만 대표 사진을 조회한다', async () => {
    const { service, config, tourPhotoProvider } = createService()
    config.get.mockReturnValue(2)
    const resolvers: Array<(photos: []) => void> = []
    tourPhotoProvider.findPhotos.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        }),
    )
    const targets = [target, { ...target, id: '2' }, { ...target, id: '3' }]

    const result = service.findPreviewPhotos(targets)
    await new Promise((resolve) => setImmediate(resolve))
    expect(tourPhotoProvider.findPhotos).toHaveBeenCalledTimes(2)

    resolvers[0]([])
    resolvers[1]([])
    await new Promise((resolve) => setImmediate(resolve))
    expect(tourPhotoProvider.findPhotos).toHaveBeenCalledTimes(3)

    resolvers[2]([])
    await expect(result).resolves.toEqual(new Map())
  })
})
