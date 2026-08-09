import { ServiceUnavailableException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
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

    await expect(service.searchAddress(request)).rejects.toThrow(
      '카카오 주소 검색 API가 401 상태를 반환했습니다.',
    )
  })

  it('카카오 API 응답 형식이 잘못되면 Bad Gateway로 변환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ invalid: true }), { status: 200 }),
      )
    const service = createService()

    await expect(service.searchAddress(request)).rejects.toThrow(
      '카카오 주소 검색 API 응답 형식이 올바르지 않습니다.',
    )
  })

  it('REST API 키가 없으면 외부 API를 호출하지 않는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    const service = createService('')

    await expect(service.searchAddress(request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
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
        name: '서울 강남구',
        address: '서울 강남구',
        latitude: 37.4979,
        longitude: 127.0276,
      },
    ])
  })
})
