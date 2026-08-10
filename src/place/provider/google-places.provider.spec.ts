import { ServiceUnavailableException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { GooglePlacesProvider } from './google-places.provider'

function createProvider(apiKey = 'google-key') {
  const config = {
    get: jest.fn().mockReturnValue(apiKey),
  } as unknown as ConfigService<Env, true>
  return new GooglePlacesProvider(config)
}

describe('GooglePlacesProvider', () => {
  afterEach(() => jest.restoreAllMocks())

  it('Nearby Search 응답을 내부 장소 정보로 변환한다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            {
              id: 'places/abc',
              displayName: { text: '성수 카페' },
              formattedAddress: '서울 성동구 성수이로 1',
              location: { latitude: 37.5446, longitude: 127.0557 },
              nationalPhoneNumber: '02-1234-5678',
              googleMapsUri: 'https://maps.google.com/?cid=1',
              primaryType: 'cafe',
              types: ['cafe'],
            },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(
      createProvider().searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        providerTypes: ['cafe'],
      }),
    ).resolves.toEqual({
      places: [
        {
          providerPlaceId: 'places/abc',
          name: '성수 카페',
          address: '서울 성동구 성수이로 1',
          roadAddress: '서울 성동구 성수이로 1',
          latitude: 37.5446,
          longitude: 127.0557,
          phone: '02-1234-5678',
          placeUrl: 'https://maps.google.com/?cid=1',
          providerCategoryCode: 'cafe',
        },
      ],
      isComplete: true,
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({
      'X-Goog-Api-Key': 'google-key',
    })
    expect(options?.headers).toHaveProperty('X-Goog-FieldMask')
  })

  it('API 키가 없으면 외부 API를 호출하지 않는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')

    await expect(
      createProvider('').searchNearby({
        latitude: 37.5,
        longitude: 127,
        radiusMeters: 750,
        providerTypes: ['cafe'],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
