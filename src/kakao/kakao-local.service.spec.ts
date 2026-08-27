import type { ConfigService } from '@nestjs/config'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import type { Env } from 'src/config/env'
import { KakaoLocalService } from './kakao-local.service'

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

const keywordRequest = {
  query: '강남역 2번출구',
  page: 1,
  size: 15,
}

describe('KakaoLocalService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
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
