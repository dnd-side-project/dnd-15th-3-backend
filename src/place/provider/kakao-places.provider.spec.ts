/* biome-ignore-all lint/style/useNamingConvention: 카카오 API 요청·응답 이름과 동일하게 유지 */
import type { ConfigService } from '@nestjs/config'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { Env } from 'src/config/env'
import { PlaceErrorCode } from '../exception/place-error-code'
import { KAKAO_OTHER_CATEGORY_GROUP_CODES } from './kakao-place-category-mapping'
import { KakaoPlacesProvider } from './kakao-places.provider'

function createProvider(apiKey = 'kakao-key') {
  const config = {
    get: jest.fn().mockReturnValue(apiKey),
  } as unknown as ConfigService<Env, true>
  return new KakaoPlacesProvider(config)
}

function createDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: '12345',
    place_name: '성수 카페',
    category_name: '음식점 > 카페',
    category_group_code: 'CE7',
    category_group_name: '카페',
    phone: '',
    address_name: '서울 성동구 성수동1가 1',
    road_address_name: '서울 성동구 성수이로 1',
    x: '127.0557',
    y: '37.5446',
    place_url: 'http://place.map.kakao.com/12345',
    distance: '120',
    ...overrides,
  }
}

function createResponse(
  documents: Record<string, unknown>[],
  meta: Record<string, unknown> = {},
) {
  return new Response(
    JSON.stringify({
      meta: {
        total_count: documents.length,
        pageable_count: documents.length,
        is_end: true,
        ...meta,
      },
      documents,
    }),
    { status: 200 },
  )
}

describe('KakaoPlacesProvider', () => {
  afterEach(() => jest.restoreAllMocks())

  it('카테고리 검색을 호출하고 응답을 내부 장소 정보로 변환한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createResponse([createDocument()]))

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Cafe,
      }),
    ).resolves.toEqual({
      places: [
        {
          providerPlaceId: '12345',
          name: '성수 카페',
          address: '서울 성동구 성수동1가 1',
          roadAddress: '서울 성동구 성수이로 1',
          latitude: 37.5446,
          longitude: 127.0557,
          phone: null,
          placeUrl: 'http://place.map.kakao.com/12345',
          providerCategoryCode: 'CE7',
        },
      ],
      isComplete: true,
    })

    const [input, options] = fetchMock.mock.calls[0]
    const url = new URL(String(input))
    expect(url.origin + url.pathname).toBe(
      'https://dapi.kakao.com/v2/local/search/category.json',
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      x: '127',
      y: '37.5',
      radius: '750',
      sort: 'distance',
      page: '1',
      size: '15',
      category_group_code: 'CE7',
    })
    expect(options?.headers).toEqual({ Authorization: 'KakaoAK kakao-key' })
  })

  it('사용자 검색어가 있으면 반경과 카테고리를 유지한 키워드 검색을 호출한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createResponse([createDocument()]))

    await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 2000,
      categorySlug: CategorySlug.Cafe,
      query: '숨은 카페',
    })

    const [input] = fetchMock.mock.calls[0]
    const url = new URL(String(input))
    expect(url.origin + url.pathname).toBe(
      'https://dapi.kakao.com/v2/local/search/keyword.json',
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      x: '127',
      y: '37.5',
      radius: '2000',
      sort: 'distance',
      page: '1',
      size: '15',
      query: '숨은 카페',
      category_group_code: 'CE7',
    })
  })

  it('Kakao 그룹이 없는 서비스 카테고리는 사용자 검색어와 카테고리 키워드를 조합한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(createResponse([])))

    await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 2000,
      categorySlug: CategorySlug.Activity,
      query: '플레이존',
    })

    expect(
      fetchMock.mock.calls.map(([input]) =>
        new URL(String(input)).searchParams.get('query'),
      ),
    ).toEqual([
      '플레이존 방탈출',
      '플레이존 볼링장',
      '플레이존 클라이밍',
      '플레이존 보드게임카페',
      '플레이존 놀이공원',
    ])
  })

  it('키워드별 모든 페이지를 순차 조회하고 장소 ID로 중복 제거한다', async () => {
    const shared = createDocument({
      id: 'shared',
      category_group_code: '',
      category_name: '음식점 > 술집',
    })
    const second = createDocument({ id: 'second', place_name: '두 번째 술집' })
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input) => {
        const url = new URL(String(input))
        const isFirstQuery = url.searchParams.get('query') === '술집'
        const page = url.searchParams.get('page')
        if (isFirstQuery && page === '1') {
          return Promise.resolve(
            createResponse([shared], {
              total_count: 2,
              pageable_count: 2,
              is_end: false,
            }),
          )
        }
        if (isFirstQuery && page === '2') {
          return Promise.resolve(
            createResponse([second], {
              total_count: 2,
              pageable_count: 2,
            }),
          )
        }
        return Promise.resolve(createResponse([shared]))
      })

    const result = await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 750,
      categorySlug: CategorySlug.Bar,
    })

    expect(result.places.map((place) => place.providerPlaceId)).toEqual([
      'shared',
      'second',
    ])
    expect(result.places[0].providerCategoryCode).toBe('음식점 > 술집')
    expect(result.isComplete).toBe(true)
    expect(
      fetchMock.mock.calls.map(([input]) => {
        const url = new URL(String(input))
        return [url.searchParams.get('query'), url.searchParams.get('page')]
      }),
    ).toEqual([
      ['술집', '1'],
      ['술집', '2'],
      ['와인바', '1'],
      ['칵테일바', '1'],
      ['펍', '1'],
      ['이자카야', '1'],
    ])
  })

  it('검색 결과가 Kakao 노출 가능 범위를 넘으면 불완전으로 표시한다', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse([createDocument()], {
        total_count: 46,
        pageable_count: 45,
      }),
    )

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Restaurant,
      }),
    ).resolves.toMatchObject({ isComplete: false })
  })

  it('마지막 페이지 신호가 없으면 최대 페이지까지만 조회하고 불완전으로 표시한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        createResponse([], {
          total_count: 1,
          pageable_count: 1,
          is_end: false,
        }),
      ),
    )

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Restaurant,
      }),
    ).resolves.toMatchObject({ isComplete: false })
    expect(fetchMock).toHaveBeenCalledTimes(45)
  })

  it('기타 카테고리는 명시적인 카테고리를 제외한 Kakao 그룹을 모두 검색한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(createResponse([])))

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Other,
      }),
    ).resolves.toEqual({ places: [], isComplete: true })

    expect(
      fetchMock.mock.calls.map(([input]) =>
        new URL(String(input)).searchParams.get('category_group_code'),
      ),
    ).toEqual(KAKAO_OTHER_CATEGORY_GROUP_CODES)
    expect(createProvider().supportsCategory(CategorySlug.Other)).toBe(true)
    expect(createProvider().supportsCategory(CategorySlug.Bar)).toBe(true)
  })

  it('targetTotal을 주면 스펙 수로 나눈 페이지 수만큼만 요청한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        createResponse([createDocument()], {
          total_count: 1000,
          pageable_count: 1000,
          is_end: false,
        }),
      ),
    )

    await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 750,
      categorySlug: CategorySlug.Cafe, // 스펙 1개
      targetTotal: 30, // ceil(30 / (15 × 1)) = 2페이지
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      fetchMock.mock.calls
        .map(([input]) => new URL(String(input)).searchParams.get('page'))
        .sort(),
    ).toEqual(['1', '2'])
  })

  it('targetTotal이 매우 크면 스펙당 페이지 수가 KAKAO_MAX_PAGE(45)를 넘지 않는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        createResponse([createDocument()], {
          total_count: 100000,
          pageable_count: 100000,
          is_end: false,
        }),
      ),
    )

    await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 750,
      categorySlug: CategorySlug.Cafe, // 스펙 1개
      targetTotal: 100000, // ceil(100000 / 15) = 6667페이지로 계산되지만 45로 잘려야 함
    })

    expect(fetchMock).toHaveBeenCalledTimes(45)
    const pages = fetchMock.mock.calls.map(([input]) =>
      Number(new URL(String(input)).searchParams.get('page')),
    )
    expect(Math.max(...pages)).toBe(45)
  })

  it('targetTotal은 스펙이 여러 개면 스펙별로 나눠서 페이지를 계산한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        createResponse([createDocument()], {
          total_count: 1000,
          pageable_count: 1000,
          is_end: false,
        }),
      ),
    )

    await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 750,
      categorySlug: CategorySlug.Bar, // 스펙 5개
      targetTotal: 300, // ceil(300 / (15 × 5)) = 4페이지 × 5스펙 = 20회
    })

    expect(fetchMock).toHaveBeenCalledTimes(20)
  })

  it('targetTotal이 있어도 배치 안에서 is_end가 나오면 다음 배치는 건너뛴다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(createResponse([createDocument()], { is_end: true })),
      )

    await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 750,
      categorySlug: CategorySlug.Cafe, // 스펙 1개
      targetTotal: 300, // ceil(300 / 15) = 20페이지로 계산되지만
    })

    // 첫 배치(5개)에서 이미 is_end가 나와서, 이후 배치(6~20페이지)는 요청하지 않는다.
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('targetTotal이 있어도 스펙끼리 장소 ID로 중복 제거한다', async () => {
    const shared = createDocument({ id: 'shared' })
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(createResponse([shared], { is_end: true })),
      )

    const result = await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 750,
      categorySlug: CategorySlug.Culture, // 스펙 2개(CT1 카테고리 + '전시회' 키워드)
      targetTotal: 30,
    })

    expect(result.places.map((place) => place.providerPlaceId)).toEqual([
      'shared',
    ])
  })

  it('targetTotal이 있을 때 한 스펙이 일찍 끝나도 다른 스펙은 영향받지 않는다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input) => {
        const url = new URL(String(input))
        // CT1 카테고리 스펙은 첫 페이지부터 is_end, '전시회' 키워드 스펙은 계속 더 있음.
        const isCategorySpec =
          url.searchParams.get('category_group_code') === 'CT1'
        return Promise.resolve(
          createResponse([createDocument({ id: url.toString() })], {
            is_end: isCategorySpec,
          }),
        )
      })

    await createProvider().searchNearby({
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 750,
      categorySlug: CategorySlug.Culture, // 스펙 2개
      targetTotal: 150, // ceil(150 / (15 × 2)) = 5페이지 × 2스펙 = 10회 예정
    })

    const calls = fetchMock.mock.calls.map(([input]) => {
      const url = new URL(String(input))
      return url.searchParams.get('category_group_code') === 'CT1'
        ? 'category'
        : 'keyword'
    })
    // CT1(카테고리) 스펙은 5페이지가 담긴 첫 배치에서 이미 is_end라 5번만 호출되고,
    // '전시회'(키워드) 스펙은 CT1과 무관하게 필요한 5페이지를 그대로 다 호출한다.
    expect(calls.filter((type) => type === 'category')).toHaveLength(5)
    expect(calls.filter((type) => type === 'keyword')).toHaveLength(5)
  })

  it('targetTotal이 있어도 Kakao 노출 가능 범위를 넘으면 불완전으로 표시한다', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        createResponse([createDocument()], {
          total_count: 46,
          pageable_count: 45,
          is_end: true,
        }),
      ),
    )

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Restaurant, // 스펙 1개
        targetTotal: 30,
      }),
    ).resolves.toMatchObject({ isComplete: false })
  })

  it('API 키가 없으면 외부 API를 호출하지 않는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')

    await expect(
      createProvider('').searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Cafe,
      }),
    ).rejects.toMatchObject({ errorCode: PlaceErrorCode.providerUnavailable })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('외부 API 호출 실패를 Provider 요청 오류로 변환한다', async () => {
    const request = {
      latitude: 37.5,
      longitude: 127,
      radiusMeters: 750,
      categorySlug: CategorySlug.Cafe,
    }
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    fetchMock.mockRejectedValueOnce(new Error('network error'))
    await expect(createProvider().searchNearby(request)).rejects.toMatchObject({
      errorCode: PlaceErrorCode.providerRequestFailed,
    })
  })

  it('429는 재시도하다가 계속 실패하면 Provider 요청 오류로 변환한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 429 }))

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Cafe,
      }),
    ).rejects.toMatchObject({
      errorCode: PlaceErrorCode.providerRequestFailed,
    })
    // 최초 시도 + 재시도 2번 = 총 3번 호출하고서야 포기한다.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('429가 재시도 중 회복되면 정상 결과를 반환한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(createResponse([createDocument()]))

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Cafe,
      }),
    ).resolves.toMatchObject({
      places: [expect.objectContaining({ providerPlaceId: '12345' })],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('targetTotal 배치 경로에서도 429는 재시도한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(
        createResponse([createDocument()], { is_end: true }),
      )

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Cafe, // 스펙 1개
        targetTotal: 15, // ceil(15 / 15) = 1페이지 → 배치 1개(요청 1건)로 시작
      }),
    ).resolves.toMatchObject({
      places: [expect.objectContaining({ providerPlaceId: '12345' })],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['JSON이 아닌 응답', new Response('not-json', { status: 200 })],
    [
      '스키마가 다른 응답',
      new Response(JSON.stringify({ meta: {}, documents: [] }), {
        status: 200,
      }),
    ],
    [
      '유효하지 않은 좌표',
      createResponse([createDocument({ y: 'not-a-latitude' })]),
    ],
  ])('%s은 잘못된 Provider 응답으로 처리한다', async (_, response) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        categorySlug: CategorySlug.Cafe,
      }),
    ).rejects.toMatchObject({
      errorCode: PlaceErrorCode.invalidProviderResponse,
    })
  })
})
