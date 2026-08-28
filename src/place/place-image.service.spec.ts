import type { Repository } from 'typeorm'
import type { PlaceImage } from './entities/place-image.entity'
import { PlacePhotoSource } from './enums/place-photo-source.enum'
import type { PlacePhoto } from './photo/place-photo.types'
import { PlaceImageService } from './place-image.service'

const attribution = {
  displayName: '한국관광공사 · 공공누리 제1유형',
  uri: 'https://www.data.go.kr/data/15101578/openapi.do',
  photoUri: null,
}

const tourPhoto: PlacePhoto = {
  id: 'tour:1:1',
  url: 'https://tong.visitkorea.or.kr/photo.jpg',
  width: null,
  height: null,
  source: PlacePhotoSource.Tour,
  attributions: [attribution],
  googleMapsUri: null,
  flagContentUri: null,
}

function createService() {
  const placeImageRepository = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  }
  const mediaService = {
    getPublicUrl: jest.fn(
      (objectKey: string) => `https://media.example.com/${objectKey}`,
    ),
    storePublicImage: jest.fn(),
  }

  return {
    service: new PlaceImageService(
      placeImageRepository as unknown as Repository<PlaceImage>,
      mediaService as never,
    ),
    placeImageRepository,
    mediaService,
  }
}

describe('PlaceImageService', () => {
  afterEach(() => jest.restoreAllMocks())

  it('장소 ID가 없으면 대표 사진 저장소를 조회하지 않는다', async () => {
    const { service, placeImageRepository } = createService()

    await expect(service.getPrimaryPhotos([])).resolves.toEqual(new Map())
    expect(placeImageRepository.find).not.toHaveBeenCalled()
  })

  it('저장된 출처와 표시 정보를 OCI 공개 URL에 유지한다', async () => {
    const { service, placeImageRepository } = createService()
    placeImageRepository.find.mockResolvedValue([
      {
        place: { id: '1' },
        displayOrder: 1,
        source: PlacePhotoSource.Tour,
        attributions: [attribution],
        mediaAsset: { objectKey: 'media/tour.jpg' },
      },
    ])

    await expect(service.getPrimaryPhotos(['1'])).resolves.toEqual(
      new Map([
        [
          '1',
          expect.objectContaining({
            url: 'https://media.example.com/media/tour.jpg',
            source: PlacePhotoSource.Tour,
            attributions: [attribution],
          }),
        ],
      ]),
    )
  })

  it('TourAPI 사진을 OCI에 저장하고 장소 대표 사진으로 연결한다', async () => {
    const { service, placeImageRepository, mediaService } = createService()
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(Uint8Array.from([0xff, 0xd8, 0xff]), {
        headers: { 'content-type': 'image/jpeg' },
      }),
    )
    mediaService.storePublicImage.mockResolvedValue({
      asset: { objectKey: 'media/cached-tour.jpg' },
      publicUrl: 'https://media.example.com/media/cached-tour.jpg',
    })

    await expect(service.cacheTourPhotos('1', [tourPhoto])).resolves.toEqual([
      expect.objectContaining({
        url: 'https://media.example.com/media/cached-tour.jpg',
        source: PlacePhotoSource.Tour,
        attributions: [attribution],
      }),
    ])
    expect(mediaService.storePublicImage).toHaveBeenCalledWith({
      body: expect.any(Uint8Array),
      mimeType: 'image/jpeg',
      sourceUrl: tourPhoto.url,
    })
    expect(placeImageRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        displayOrder: 1,
        isPrimary: true,
        source: PlacePhotoSource.Tour,
        attributions: [attribution],
      }),
    ])
  })

  it('제3자 Kakao 이미지 검색 결과는 OCI에 복제하지 않는다', async () => {
    const { service, mediaService } = createService()
    const kakaoPhoto = {
      ...tourPhoto,
      source: PlacePhotoSource.Kakao,
      url: 'https://example.com/photo.jpg',
    }

    await expect(service.cacheTourPhotos('1', [kakaoPhoto])).resolves.toEqual([
      kakaoPhoto,
    ])
    expect(mediaService.storePublicImage).not.toHaveBeenCalled()
  })
})
