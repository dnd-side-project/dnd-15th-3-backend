import type { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import { PlaceSource } from '../enums/place-source.enum'
import {
  KakaoImagePhotoProvider,
  KakaoImagePhotoProviderError,
} from './kakao-image-photo.provider'
import type { PlacePhotoTarget } from './place-photo.types'

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

function createProvider(apiKey = 'kakao-key', redisUrl = '') {
  const config = {
    get: jest.fn((key: keyof Env) => {
      if (key === 'KAKAO_REST_API_KEY') return apiKey
      if (key === 'REDIS_URL') return redisUrl
      return undefined
    }),
  } as unknown as ConfigService<Env, true>
  return new KakaoImagePhotoProvider(config)
}

describe('KakaoImagePhotoProvider', () => {
  afterEach(() => jest.restoreAllMocks())

  it('장소명과 지역으로 이미지를 검색하고 원문 출처를 함께 반환한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          documents: [
            {
              // biome-ignore lint/style/useNamingConvention: Kakao API response field.
              image_url: 'http://images.example.com/place.jpg',
              // biome-ignore lint/style/useNamingConvention: Kakao API response field.
              thumbnail_url: 'https://search.kakaocdn.net/thumb.jpg',
              width: 1200,
              height: 900,
              // biome-ignore lint/style/useNamingConvention: Kakao API response field.
              display_sitename: '출처 사이트',
              // biome-ignore lint/style/useNamingConvention: Kakao API response field.
              doc_url: 'http://example.com/post',
            },
          ],
        }),
      ),
    )

    await expect(createProvider().findPhotos(target, 1)).resolves.toEqual([
      {
        id: 'kakao-image:1:1',
        url: 'https://images.example.com/place.jpg',
        width: 1200,
        height: 900,
        source: PlacePhotoSource.Kakao,
        attributions: [
          {
            displayName: '출처 사이트',
            uri: 'http://example.com/post',
            photoUri: null,
          },
        ],
        googleMapsUri: null,
        flagContentUri: null,
      },
    ])

    const [request, options] = fetchMock.mock.calls[0]
    const requestUrl = new URL(String(request))
    expect(requestUrl.searchParams.get('query')).toBe('나의가야 서울 강남구')
    expect(new Headers(options?.headers).get('Authorization')).toBe(
      'KakaoAK kakao-key',
    )
  })

  it('REST API 키가 없으면 외부 요청을 보내지 않는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    const provider = createProvider('')

    expect(provider.isConfigured()).toBe(false)
    await expect(provider.findPhotos(target, 1)).rejects.toBeInstanceOf(
      KakaoImagePhotoProviderError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('검색 결과를 Redis에 1일 캐시하고 다음 요청에서 재사용한다', async () => {
    let cached: string | null = null
    const get = jest.fn().mockImplementation(() => Promise.resolve(cached))
    const set = jest.fn().mockImplementation((_key: string, value: string) => {
      cached = value
      return Promise.resolve('OK')
    })
    const provider = createProvider()
    Object.assign(provider, {
      cacheClient: { isReady: true, isOpen: true, get, set },
    })
    const responseBody = {
      documents: [
        {
          // biome-ignore lint/style/useNamingConvention: Kakao API response field.
          image_url: 'https://images.example.com/place.jpg',
          // biome-ignore lint/style/useNamingConvention: Kakao API response field.
          thumbnail_url: 'https://search.kakaocdn.net/thumb.jpg',
          width: 1200,
          height: 900,
          // biome-ignore lint/style/useNamingConvention: Kakao API response field.
          display_sitename: '출처 사이트',
          // biome-ignore lint/style/useNamingConvention: Kakao API response field.
          doc_url: 'https://example.com/post',
        },
      ],
    }
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(responseBody)))

    await provider.findPhotos(target, 1)
    await provider.findPhotos(target, 1)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith(
      expect.stringContaining('momo:kakao-image:v1:'),
      JSON.stringify(responseBody),
      { expiration: { type: 'EX', value: 86_400 } },
    )
    expect(get).toHaveBeenCalledTimes(2)
  })
})
