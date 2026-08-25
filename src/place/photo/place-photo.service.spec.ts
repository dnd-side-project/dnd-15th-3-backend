import type { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import type { Repository } from 'typeorm'
import type { PlacePhotoMatch } from '../entities/place-photo-match.entity'
import { PlacePhotoMatchStatus } from '../enums/place-photo-match-status.enum'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import { PlaceSource } from '../enums/place-source.enum'
import type { PlaceImageService } from '../place-image.service'
import type { GooglePlacePhotoProvider } from './google-place-photo.provider'
import { PlacePhotoService } from './place-photo.service'
import type {
  GooglePhotoReference,
  GooglePlacePhotoCandidate,
  PlacePhotoTarget,
} from './place-photo.types'

const target: PlacePhotoTarget = {
  id: '1',
  source: PlaceSource.Kakao,
  providerPlaceId: 'kakao-1',
  name: '나의가야',
  address: '서울 강남구 삼성동 159-7',
  roadAddress: '서울 강남구 역삼로69길 5',
  latitude: 37.508,
  longitude: 127.05,
  phone: '02-1234-5678',
}

const photoReference: GooglePhotoReference = {
  name: 'places/google-1/photos/photo-1',
  width: 1200,
  height: 900,
  authorAttributions: [{ displayName: '사진가', uri: null, photoUri: null }],
  googleMapsUri: 'https://www.google.com/maps/place/photo-1',
  flagContentUri: 'https://www.google.com/local/imagery/report/photo-1',
}

const matchedCandidate: GooglePlacePhotoCandidate = {
  id: 'google-1',
  name: '나의가야',
  address: '대한민국 서울 강남구 역삼로69길 5',
  latitude: 37.50801,
  longitude: 127.05001,
  phone: '02-1234-5678',
  photos: [photoReference],
}

function createService(configured = true) {
  const matchRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  }
  const placeImageService = {
    getPrimaryImageUrls: jest.fn().mockResolvedValue(new Map()),
    getImageUrls: jest.fn().mockResolvedValue([]),
  }
  const googlePhotoProvider = {
    isConfigured: jest.fn().mockReturnValue(configured),
    searchCandidates: jest.fn().mockResolvedValue([]),
    getPhotoReferences: jest.fn().mockResolvedValue([]),
    getPhotoUrl: jest.fn().mockResolvedValue(null),
  }
  const config = {
    get: jest.fn().mockReturnValue(10),
  }

  return {
    service: new PlacePhotoService(
      matchRepository as unknown as Repository<PlacePhotoMatch>,
      placeImageService as unknown as PlaceImageService,
      googlePhotoProvider as unknown as GooglePlacePhotoProvider,
      config as unknown as ConfigService<Env, true>,
    ),
    matchRepository,
    placeImageService,
    googlePhotoProvider,
    config,
  }
}

describe('PlacePhotoService', () => {
  it('직접 소유한 사진을 외부 제공자보다 우선한다', async () => {
    const { service, placeImageService, googlePhotoProvider } = createService()
    placeImageService.getPrimaryImageUrls.mockResolvedValue(
      new Map([['1', 'https://media.example.com/place-1.jpg']]),
    )

    await expect(service.findPreviewPhotos([target])).resolves.toEqual(
      new Map([
        [
          '1',
          {
            id: 'owned:1:1',
            url: 'https://media.example.com/place-1.jpg',
            width: null,
            height: null,
            source: PlacePhotoSource.Owned,
            attributions: [],
            googleMapsUri: null,
            flagContentUri: null,
          },
        ],
      ]),
    )
    expect(googlePhotoProvider.searchCandidates).not.toHaveBeenCalled()
  })

  it('Google 키가 없으면 장소 응답을 깨뜨리지 않고 사진만 비운다', async () => {
    const { service, matchRepository, googlePhotoProvider } =
      createService(false)

    await expect(service.findPhotos(target)).resolves.toEqual([])
    expect(matchRepository.findOne).not.toHaveBeenCalled()
    expect(googlePhotoProvider.searchCandidates).not.toHaveBeenCalled()
  })

  it('Kakao 장소를 Google 업체와 엄격히 매칭한 뒤 사진과 출처를 응답한다', async () => {
    const { service, matchRepository, googlePhotoProvider } = createService()
    googlePhotoProvider.searchCandidates.mockResolvedValue([matchedCandidate])
    googlePhotoProvider.getPhotoUrl.mockResolvedValue(
      'https://lh3.googleusercontent.com/places/photo-1',
    )

    await expect(service.findPhotos(target)).resolves.toEqual([
      {
        id: 'google:1:1',
        url: 'https://lh3.googleusercontent.com/places/photo-1',
        width: 1200,
        height: 900,
        source: PlacePhotoSource.Google,
        attributions: photoReference.authorAttributions,
        googleMapsUri: photoReference.googleMapsUri,
        flagContentUri: photoReference.flagContentUri,
      },
    ])
    expect(matchRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: PlaceSource.Google,
        providerPlaceId: 'google-1',
        status: PlacePhotoMatchStatus.Matched,
      }),
    )
    expect(googlePhotoProvider.getPhotoReferences).not.toHaveBeenCalled()
    expect(googlePhotoProvider.getPhotoUrl).toHaveBeenCalledWith(
      photoReference.name,
      1600,
    )
  })

  it('Google Maps 원본 링크가 없는 사진은 노출하지 않는다', async () => {
    const { service, googlePhotoProvider } = createService()
    googlePhotoProvider.searchCandidates.mockResolvedValue([
      {
        ...matchedCandidate,
        photos: [{ ...photoReference, googleMapsUri: null }],
      },
    ])

    await expect(service.findPhotos(target)).resolves.toEqual([])
    expect(googlePhotoProvider.getPhotoUrl).not.toHaveBeenCalled()
  })

  it('후보가 모호하면 매칭 상태만 저장하고 사진은 노출하지 않는다', async () => {
    const { service, matchRepository, googlePhotoProvider } = createService()
    googlePhotoProvider.searchCandidates.mockResolvedValue([
      matchedCandidate,
      { ...matchedCandidate, id: 'google-2', longitude: 127.05002 },
    ])

    await expect(service.findPhotos(target)).resolves.toEqual([])
    expect(matchRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        providerPlaceId: null,
        status: PlacePhotoMatchStatus.Ambiguous,
      }),
    )
    expect(googlePhotoProvider.getPhotoUrl).not.toHaveBeenCalled()
  })

  it('유효한 업체 매칭은 재검색하지 않고 최신 사진 리소스만 조회한다', async () => {
    const { service, matchRepository, googlePhotoProvider } = createService()
    matchRepository.findOne.mockResolvedValue({
      providerPlaceId: 'google-1',
      status: PlacePhotoMatchStatus.Matched,
      expiresAt: new Date(Date.now() + 60_000),
    })
    googlePhotoProvider.getPhotoReferences.mockResolvedValue([photoReference])
    googlePhotoProvider.getPhotoUrl.mockResolvedValue(
      'https://lh3.googleusercontent.com/places/photo-1',
    )

    await expect(service.findPhotos(target)).resolves.toHaveLength(1)
    expect(googlePhotoProvider.searchCandidates).not.toHaveBeenCalled()
    expect(googlePhotoProvider.getPhotoReferences).toHaveBeenCalledWith(
      'google-1',
    )
  })

  it('대표 사진의 기존 Google 매칭을 한 번에 조회한다', async () => {
    const { service, matchRepository, googlePhotoProvider } = createService()
    const secondTarget = { ...target, id: '2', providerPlaceId: 'kakao-2' }
    matchRepository.find.mockResolvedValue([
      {
        place: { id: '1' },
        providerPlaceId: 'google-1',
        status: PlacePhotoMatchStatus.Matched,
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        place: { id: '2' },
        providerPlaceId: 'google-2',
        status: PlacePhotoMatchStatus.Matched,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ])
    googlePhotoProvider.getPhotoReferences.mockResolvedValue([photoReference])
    googlePhotoProvider.getPhotoUrl.mockResolvedValue(
      'https://lh3.googleusercontent.com/places/photo-1',
    )

    const result = await service.findPreviewPhotos([target, secondTarget])

    expect(result.size).toBe(2)
    expect(matchRepository.find).toHaveBeenCalledTimes(1)
    expect(matchRepository.findOne).not.toHaveBeenCalled()
    expect(googlePhotoProvider.searchCandidates).not.toHaveBeenCalled()
  })

  it('동시에 들어온 동일 대표 사진 조회는 외부 요청을 공유한다', async () => {
    const { service, googlePhotoProvider } = createService()
    let resolveCandidates!: (candidates: GooglePlacePhotoCandidate[]) => void
    const candidates = new Promise<GooglePlacePhotoCandidate[]>((resolve) => {
      resolveCandidates = resolve
    })
    googlePhotoProvider.searchCandidates.mockReturnValue(candidates)
    googlePhotoProvider.getPhotoUrl.mockResolvedValue(
      'https://lh3.googleusercontent.com/places/photo-1',
    )

    const first = service.findPreviewPhotos([target])
    const second = service.findPreviewPhotos([target])
    await new Promise((resolve) => setImmediate(resolve))
    expect(googlePhotoProvider.searchCandidates).toHaveBeenCalledTimes(1)
    resolveCandidates([matchedCandidate])

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(googlePhotoProvider.searchCandidates).toHaveBeenCalledTimes(1)
    expect(googlePhotoProvider.getPhotoUrl).toHaveBeenCalledTimes(1)
  })

  it('설정된 동시성만큼만 대표 사진을 조회한다', async () => {
    const { service, config, googlePhotoProvider } = createService()
    config.get.mockReturnValue(2)
    const resolvers: Array<(candidates: GooglePlacePhotoCandidate[]) => void> =
      []
    googlePhotoProvider.searchCandidates.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        }),
    )
    const targets = [
      target,
      { ...target, id: '2', providerPlaceId: 'kakao-2' },
      { ...target, id: '3', providerPlaceId: 'kakao-3' },
    ]

    const result = service.findPreviewPhotos(targets)
    await new Promise((resolve) => setImmediate(resolve))
    expect(googlePhotoProvider.searchCandidates).toHaveBeenCalledTimes(2)

    resolvers[0]([])
    resolvers[1]([])
    await new Promise((resolve) => setImmediate(resolve))
    expect(googlePhotoProvider.searchCandidates).toHaveBeenCalledTimes(3)

    resolvers[2]([])
    await expect(result).resolves.toEqual(new Map())
  })

  it('매칭 배치 조회가 실패해도 장소 응답을 사진 오류로 깨뜨리지 않는다', async () => {
    const { service, matchRepository, googlePhotoProvider } = createService()
    matchRepository.find.mockRejectedValue(new Error('database unavailable'))
    googlePhotoProvider.searchCandidates.mockRejectedValue(
      new Error('provider unavailable'),
    )

    await expect(service.findPreviewPhotos([target])).resolves.toEqual(
      new Map(),
    )
  })

  it('Google 장소는 이미 가진 Place ID를 사용해 별도 매칭을 생략한다', async () => {
    const { service, matchRepository, googlePhotoProvider } = createService()
    googlePhotoProvider.getPhotoReferences.mockResolvedValue([photoReference])
    googlePhotoProvider.getPhotoUrl.mockResolvedValue(
      'https://lh3.googleusercontent.com/places/photo-1',
    )

    await expect(
      service.findPhotos({
        ...target,
        source: PlaceSource.Google,
        providerPlaceId: 'google-1',
      }),
    ).resolves.toHaveLength(1)
    expect(matchRepository.findOne).not.toHaveBeenCalled()
    expect(googlePhotoProvider.searchCandidates).not.toHaveBeenCalled()
  })

  it('사진 제공자 장애나 개별 사진 실패가 장소 본문 응답으로 전파되지 않는다', async () => {
    const { service, googlePhotoProvider } = createService()
    googlePhotoProvider.searchCandidates.mockRejectedValue(
      new Error('provider unavailable'),
    )

    await expect(service.findPhotos(target)).resolves.toEqual([])

    googlePhotoProvider.searchCandidates.mockResolvedValue([matchedCandidate])
    googlePhotoProvider.getPhotoUrl.mockRejectedValue(
      new Error('photo unavailable'),
    )
    await expect(service.findPhotos({ ...target, id: '2' })).resolves.toEqual(
      [],
    )
  })
})
