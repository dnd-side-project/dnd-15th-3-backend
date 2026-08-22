import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { Repository } from 'typeorm'
import { Place } from './entities/place.entity'
import { PlaceSource } from './enums/place-source.enum'
import { PlaceLiveDataService } from './place-live-data.service'
import type { KakaoPlacesProvider } from './provider/kakao-places.provider'

const center = { latitude: 37.5, longitude: 127 }
const category = {
  id: '1',
  name: '카페',
  slug: CategorySlug.Cafe,
  displayOrder: 2,
}
const livePlace = {
  providerPlaceId: '12345',
  name: '성수 카페',
  address: '서울 성동구 성수동 1',
  roadAddress: '서울 성동구 성수이로 1',
  latitude: 37.501,
  longitude: 127.001,
  phone: '02-1234-5678',
  placeUrl: 'https://place.map.kakao.com/12345',
  providerCategoryCode: 'CE7',
}

function createService() {
  const reference = {
    id: '10',
    category,
    name: '12345',
    address: 'KAKAO_PLACE_REFERENCE',
    latitude: 0,
    longitude: 0,
    source: PlaceSource.Kakao,
    providerPlaceId: '12345',
    placeUrl: 'https://place.map.kakao.com/12345',
    phone: null,
    roadAddress: null,
    providerCategoryCode: null,
    lastSyncedAt: null,
    previewUrl: null,
  }
  const placeRepository = {
    upsert: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([reference]),
  }
  const kakaoProvider = {
    supportsCategory: jest.fn().mockReturnValue(true),
    searchNearby: jest.fn().mockResolvedValue({
      places: [livePlace],
      isComplete: true,
    }),
  }
  return {
    service: new PlaceLiveDataService(
      placeRepository as unknown as Repository<Place>,
      kakaoProvider as unknown as KakaoPlacesProvider,
    ),
    placeRepository,
    kakaoProvider,
    reference,
  }
}

describe('PlaceLiveDataService', () => {
  it('Kakao 실시간 결과를 응답하되 DB에는 장소 ID와 URL 외의 provider 데이터는 저장하지 않는다', async () => {
    const { service, placeRepository } = createService()

    await expect(
      service.searchKakao(center, [category as never]),
    ).resolves.toMatchObject({
      places: [
        {
          id: '10',
          name: livePlace.name,
          address: livePlace.address,
          latitude: livePlace.latitude,
          longitude: livePlace.longitude,
          providerPlaceId: livePlace.providerPlaceId,
          placeUrl: livePlace.placeUrl,
        },
      ],
      isComplete: true,
    })

    const [values, options] = placeRepository.upsert.mock.calls[0]
    expect(values).toEqual([
      expect.objectContaining({
        name: livePlace.providerPlaceId,
        address: 'KAKAO_PLACE_REFERENCE',
        latitude: 0,
        longitude: 0,
        providerPlaceId: livePlace.providerPlaceId,
        placeUrl: livePlace.placeUrl,
        phone: null,
        roadAddress: null,
        providerCategoryCode: null,
      }),
    ])
    expect(values[0]).not.toEqual(
      expect.objectContaining({ name: livePlace.name }),
    )
    expect(values[0]).not.toEqual(
      expect.objectContaining({ address: livePlace.address }),
    )
    expect(options).toEqual({
      conflictPaths: ['source', 'providerPlaceId'],
      skipUpdateIfNoValuesChanged: true,
    })
  })

  it('저장된 Kakao reference는 카테고리 반경 검색으로 다시 해석한다', async () => {
    const { service, reference, kakaoProvider } = createService()

    const result = await service.resolvePlaces([reference as never], center)

    expect(kakaoProvider.searchNearby).toHaveBeenCalledWith({
      ...center,
      radiusMeters: 2000,
      categorySlug: CategorySlug.Cafe,
    })
    expect(result.get('10')).toMatchObject({
      name: livePlace.name,
      address: livePlace.address,
      latitude: livePlace.latitude,
      longitude: livePlace.longitude,
    })
  })

  it('Kakao가 지원하지 않는 카테고리는 빈 결과와 unsupported 목록으로 반환한다', async () => {
    const { service, kakaoProvider } = createService()
    kakaoProvider.supportsCategory.mockReturnValue(false)

    await expect(
      service.searchKakao(center, [
        { ...category, slug: CategorySlug.Other } as never,
      ]),
    ).resolves.toEqual({
      places: [],
      isComplete: true,
      unsupportedCategorySlugs: [CategorySlug.Other],
    })
    expect(kakaoProvider.searchNearby).not.toHaveBeenCalled()
  })
})
