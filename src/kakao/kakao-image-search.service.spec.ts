/* biome-ignore-all lint/style/useNamingConvention: Kakao 이미지 검색 API 응답 필드와 동일하게 유지 */
import type { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { KakaoImageSearchService } from './kakao-image-search.service'

function createService(apiKey = 'kakao-key') {
  const config = {
    get: jest.fn().mockReturnValue(apiKey),
  } as unknown as ConfigService<Env, true>
  return new KakaoImageSearchService(config)
}

function createResponse() {
  return new Response(
    JSON.stringify({
      meta: { total_count: 3, pageable_count: 3, is_end: true },
      documents: [
        {
          collection: 'blog',
          thumbnail_url: 'https://search.example.com/first-thumbnail.jpg',
          image_url: 'https://images.example.com/first.jpg',
          width: 1280,
          height: 960,
          display_sitename: '장소 블로그',
          doc_url: 'https://blog.example.com/place',
          datetime: '2026-08-23T10:00:00.000+09:00',
        },
        {
          collection: 'cafe',
          thumbnail_url: 'https://search.example.com/second-thumbnail.jpg',
          image_url: 'http://legacy.example.com/second.jpg',
          width: 800,
          height: 600,
          display_sitename: '',
          doc_url: 'http://cafe.example.com/place',
          datetime: '2026-08-22T10:00:00.000+09:00',
        },
        {
          collection: 'blog',
          thumbnail_url: 'not-a-url',
          image_url: 'also-not-a-url',
          width: 100,
          height: 100,
          display_sitename: '잘못된 결과',
          doc_url: 'not-a-url',
          datetime: '2026-08-21T10:00:00.000+09:00',
        },
      ],
    }),
    { status: 200 },
  )
}

const target = {
  name: '성수 카페',
  address: '서울 성동구 성수동1가 1',
  roadAddress: '서울 성동구 성수이로 1',
}

describe('KakaoImageSearchService', () => {
  afterEach(() => jest.restoreAllMocks())

  it('이미지 파일을 받지 않고 검색 메타데이터의 렌더링 URL을 반환한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createResponse())

    await expect(createService().findImages(target)).resolves.toEqual([
      {
        url: 'https://images.example.com/first.jpg',
        thumbnailUrl: 'https://search.example.com/first-thumbnail.jpg',
      },
      {
        url: 'https://search.example.com/second-thumbnail.jpg',
        thumbnailUrl: 'https://search.example.com/second-thumbnail.jpg',
      },
    ])

    const [input, options] = fetchMock.mock.calls[0]
    const url = new URL(String(input))
    expect(url.origin + url.pathname).toBe(
      'https://dapi.kakao.com/v2/search/image',
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      query: '성수 카페 서울 성동구 성수이로 1',
      sort: 'accuracy',
      page: '1',
      size: '5',
    })
    expect(options?.headers).toEqual({ Authorization: 'KakaoAK kakao-key' })
  })

  it('같은 장소의 반복 요청은 캐시된 URL을 사용한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createResponse())
    const service = createService()

    const first = await service.findImages(target)
    const second = await service.findImages(target)

    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('목록 장소를 조회해 ID별 대표 이미지 URL Map으로 반환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(createResponse()))
    const service = createService()

    await expect(
      service.findPreviewUrls([
        { id: '1', ...target },
        { id: '2', ...target, name: '다른 카페' },
      ]),
    ).resolves.toEqual(
      new Map([
        ['1', 'https://search.example.com/first-thumbnail.jpg'],
        ['2', 'https://search.example.com/first-thumbnail.jpg'],
      ]),
    )
  })

  it.each([
    ['API 키가 없음', '', undefined],
    ['네트워크 오류', 'kakao-key', new Error('network error')],
  ])(
    '%s이면 장소 조회를 실패시키지 않고 빈 배열을 반환한다',
    async (_, apiKey, error) => {
      const fetchMock = jest.spyOn(globalThis, 'fetch')
      if (error) fetchMock.mockRejectedValue(error)

      await expect(createService(apiKey).findImages(target)).resolves.toEqual(
        [],
      )
      if (!apiKey) expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it('오류 상태나 잘못된 응답은 빈 배열로 처리한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }))
    await expect(createService().findImages(target)).resolves.toEqual([])

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ invalid: true }), { status: 200 }),
    )
    await expect(createService().findImages(target)).resolves.toEqual([])
  })
})
