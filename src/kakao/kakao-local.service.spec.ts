import type { ConfigService } from '@nestjs/config'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import type { Env } from 'src/config/env'
import { KakaoLocalService } from './kakao-local.service'

const validResponse = {
  meta: {
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    total_count: 1,
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    pageable_count: 1,
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    is_end: true,
  },
  documents: [
    {
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      address_name: '서울 강남구',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      address_type: 'REGION',
      x: '127.0276',
      y: '37.4979',
      address: null,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      road_address: null,
    },
  ],
}

const validKeywordResponse = {
  meta: {
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    total_count: 1,
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    pageable_count: 1,
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    is_end: true,
  },
  documents: [
    {
      id: '22906009',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      place_name: '강남역 2호선 2번출구',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      category_name: '교통,수송 > 지하철,전철 > 지하철출구',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      category_group_code: '',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      category_group_name: '',
      phone: '',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      address_name: '서울 강남구 역삼동 825-13',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      road_address_name: '',
      x: '127.028226156861',
      y: '37.4973105164911',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      place_url: 'http://place.map.kakao.com/22906009',
      distance: '',
    },
  ],
}

function createService(apiKey = 'test-rest-api-key') {
  const config = {
    get: jest.fn().mockReturnValue(apiKey),
  } as unknown as ConfigService<Env, true>

  return new KakaoLocalService(config)
}

const request = {
  query: '강남',
  // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
  analyze_type: 'similar' as const,
  page: 1,
  size: 10,
}

const keywordRequest = {
  query: '강남역 2번출구',
  page: 1,
  size: 15,
}

describe('KakaoLocalService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('카카오 주소 검색 API를 호출하고 응답을 검증한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(validResponse), { status: 200 }),
      )
    const service = createService()

    const result = await service.searchAddress(request)

    expect(result).toEqual(validResponse)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('query=%EA%B0%95%EB%82%A8')
    expect(String(url)).toContain('analyze_type=similar')
    expect(String(url)).toContain('page=1')
    expect(String(url)).toContain('size=10')
    expect(options?.headers).toEqual({
      // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
      Authorization: 'KakaoAK test-rest-api-key',
    })
  })

  it('카카오 API가 오류 상태를 반환하면 Bad Gateway로 변환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 401 }))
    const service = createService()

    await expect(service.searchAddress(request)).rejects.toMatchObject({
      errorCode: CommonErrorCode.externalServiceError,
    })
  })

  it('카카오 API 응답 형식이 잘못되면 Bad Gateway로 변환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ invalid: true }), { status: 200 }),
      )
    const service = createService()

    await expect(service.searchAddress(request)).rejects.toMatchObject({
      errorCode: CommonErrorCode.externalServiceError,
    })
  })

  it('REST API 키가 없으면 외부 API를 호출하지 않는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    const service = createService('')

    await expect(service.searchAddress(request)).rejects.toMatchObject({
      errorCode: CommonErrorCode.serviceUnavailable,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('카카오 주소 결과를 내부 장소 형태로 변환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(validResponse), { status: 200 }),
      )
    const service = createService()

    await expect(service.searchAddressPlaces(request)).resolves.toEqual([
      {
        id: 'kakao-address-127.0276-37.4979',
        externalAddressId: 'kakao-address-127.0276-37.4979',
        name: '서울 강남구',
        address: '서울 강남구',
        latitude: 37.4979,
        longitude: 127.0276,
      },
    ])
  })

  it('카카오 키워드 검색 결과를 첫 만남 위치 형태로 변환한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(validKeywordResponse), { status: 200 }),
      )
    const service = createService()

    await expect(service.searchKeywordPlaces(keywordRequest)).resolves.toEqual([
      {
        id: 'kakao-place-22906009',
        externalAddressId: 'kakao-place-22906009',
        name: '강남역 2호선 2번출구',
        address: '서울 강남구 역삼동 825-13',
        latitude: 37.4973105164911,
        longitude: 127.028226156861,
      },
    ])

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/v2/local/search/keyword.json?')
    expect(String(url)).toContain(
      'query=%EA%B0%95%EB%82%A8%EC%97%AD+2%EB%B2%88%EC%B6%9C%EA%B5%AC',
    )
    expect(String(url)).toContain('page=1')
    expect(String(url)).toContain('size=15')
  })

  it('카카오 키워드 검색 좌표가 잘못되면 외부 서비스 오류로 처리한다', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ...validKeywordResponse,
          documents: [
            { ...validKeywordResponse.documents[0], y: 'not-a-latitude' },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(
      createService().searchKeywordPlaces(keywordRequest),
    ).rejects.toMatchObject({
      errorCode: CommonErrorCode.externalServiceError,
    })
  })
})
