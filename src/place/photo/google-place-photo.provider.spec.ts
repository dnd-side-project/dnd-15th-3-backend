import type { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { PlaceSource } from '../enums/place-source.enum'
import {
  GooglePlacePhotoProvider,
  GooglePlacePhotoProviderError,
} from './google-place-photo.provider'
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
  phone: '02-1234-5678',
}

function createProvider(apiKey = 'google-key') {
  const config = {
    get: jest.fn().mockReturnValue(apiKey),
  } as unknown as ConfigService<Env, true>
  return new GooglePlacePhotoProvider(config)
}

describe('GooglePlacePhotoProvider', () => {
  afterEach(() => jest.restoreAllMocks())

  it('텍스트와 위치 편향으로 사진이 포함된 업체 후보를 조회한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            {
              id: 'google-1',
              displayName: { text: '나의가야' },
              formattedAddress: '대한민국 서울 강남구 역삼로69길 5',
              location: { latitude: 37.50801, longitude: 127.05001 },
              nationalPhoneNumber: '02-1234-5678',
              photos: [
                {
                  name: 'places/google-1/photos/photo-1',
                  widthPx: 1200,
                  heightPx: 900,
                  authorAttributions: [
                    {
                      displayName: '사진가',
                      uri: 'https://example.com/author',
                      photoUri: '//example.com/avatar.jpg',
                    },
                  ],
                  googleMapsUri: 'https://www.google.com/maps/place/photo-1',
                  flagContentUri:
                    'https://www.google.com/local/imagery/report/photo-1',
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(createProvider().searchCandidates(target)).resolves.toEqual([
      {
        id: 'google-1',
        name: '나의가야',
        address: '대한민국 서울 강남구 역삼로69길 5',
        latitude: 37.50801,
        longitude: 127.05001,
        phone: '02-1234-5678',
        photos: [
          {
            name: 'places/google-1/photos/photo-1',
            width: 1200,
            height: 900,
            authorAttributions: [
              {
                displayName: '사진가',
                uri: 'https://example.com/author',
                photoUri: 'https://example.com/avatar.jpg',
              },
            ],
            googleMapsUri: 'https://www.google.com/maps/place/photo-1',
            flagContentUri:
              'https://www.google.com/local/imagery/report/photo-1',
          },
        ],
      },
    ])

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText')
    expect(options?.method).toBe('POST')
    expect(new Headers(options?.headers).get('X-Goog-Api-Key')).toBe(
      'google-key',
    )
    expect(new Headers(options?.headers).get('X-Goog-FieldMask')).toContain(
      'places.photos',
    )
    expect(JSON.parse(String(options?.body))).toMatchObject({
      textQuery: '나의가야 서울 강남구 역삼로69길 5',
      pageSize: 5,
      languageCode: 'ko',
      regionCode: 'KR',
      locationBias: {
        circle: {
          center: { latitude: 37.508, longitude: 127.05 },
          radius: 150,
        },
      },
    })
  })

  it('저장된 Google Place ID로 최신 사진 리소스를 다시 조회한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'google-1',
          photos: [
            {
              name: 'places/google-1/photos/photo-1',
              widthPx: 1200,
              heightPx: 900,
              googleMapsUri: 'https://www.google.com/maps/place/photo-1',
              flagContentUri:
                'https://www.google.com/local/imagery/report/photo-1',
            },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(
      createProvider().getPhotoReferences('places/google-1'),
    ).resolves.toEqual([
      {
        name: 'places/google-1/photos/photo-1',
        width: 1200,
        height: 900,
        authorAttributions: [],
        googleMapsUri: 'https://www.google.com/maps/place/photo-1',
        flagContentUri: 'https://www.google.com/local/imagery/report/photo-1',
      },
    ])
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://places.googleapis.com/v1/places/google-1',
    )
  })

  it('사진 리소스 이름을 현재 응답에서 사용할 HTTPS URL로 교환한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          photoUri: 'https://lh3.googleusercontent.com/places/photo-1',
        }),
        { status: 200 },
      ),
    )

    await expect(
      createProvider().getPhotoUrl('places/google-1/photos/photo-1', 400),
    ).resolves.toBe('https://lh3.googleusercontent.com/places/photo-1')
    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]))
    expect(requestUrl.pathname).toBe('/v1/places/google-1/photos/photo-1/media')
    expect(requestUrl.searchParams.get('maxWidthPx')).toBe('400')
    expect(requestUrl.searchParams.get('skipHttpRedirect')).toBe('true')
  })

  it('동일한 사진 참조와 URL의 동시 요청을 각각 한 번만 전송한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    let resolveReferences: (response: Response) => void = () => undefined
    let resolveUrl: (response: Response) => void = () => undefined
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveReferences = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUrl = resolve
          }),
      )
    const provider = createProvider()

    const firstReferences = provider.getPhotoReferences('google-1')
    const secondReferences = provider.getPhotoReferences('places/google-1')
    resolveReferences(new Response(JSON.stringify({ photos: [] })))
    await expect(
      Promise.all([firstReferences, secondReferences]),
    ).resolves.toEqual([[], []])

    const firstUrl = provider.getPhotoUrl('places/google-1/photos/photo-1', 400)
    const secondUrl = provider.getPhotoUrl(
      '/places/google-1/photos/photo-1/',
      400,
    )
    resolveUrl(
      new Response(
        JSON.stringify({
          photoUri: 'https://lh3.googleusercontent.com/places/photo-1',
        }),
      ),
    )
    await expect(Promise.all([firstUrl, secondUrl])).resolves.toEqual([
      'https://lh3.googleusercontent.com/places/photo-1',
      'https://lh3.googleusercontent.com/places/photo-1',
    ])

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('키가 없거나 사진 리소스 이름이 올바르지 않으면 외부 요청을 막는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')

    expect(createProvider('').isConfigured()).toBe(false)
    await expect(
      createProvider('').searchCandidates(target),
    ).rejects.toBeInstanceOf(GooglePlacePhotoProviderError)
    await expect(
      createProvider().getPhotoUrl('https://attacker.example/photo', 400),
    ).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('외부 API 오류를 전용 오류로 변환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 429 }))

    await expect(
      createProvider().searchCandidates(target),
    ).rejects.toBeInstanceOf(GooglePlacePhotoProviderError)
  })
})
