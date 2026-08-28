import type { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import { PlaceSource } from '../enums/place-source.enum'
import type { PlacePhotoTarget } from './place-photo.types'
import {
  TourPlacePhotoProvider,
  TourPlacePhotoProviderError,
} from './tour-place-photo.provider'

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

const matchedItem = {
  contentid: 'tour-1',
  title: '나의가야',
  addr1: '서울 강남구 역삼로69길 5',
  mapx: '127.05001',
  mapy: '37.50801',
  firstimage: 'http://tong.visitkorea.or.kr/photo-1.jpg',
  firstimage2: '',
  cpyrhtDivCd: 'Type1',
}

function createProvider(serviceKey = 'tour%2Bkey%3D') {
  const config = {
    get: jest.fn().mockReturnValue(serviceKey),
  } as unknown as ConfigService<Env, true>
  return new TourPlacePhotoProvider(config)
}

function response(items: unknown[]) {
  return {
    response: {
      header: { resultCode: '0000', resultMsg: 'OK' },
      body: { items: { item: items } },
    },
  }
}

describe('TourPlacePhotoProvider', () => {
  afterEach(() => jest.restoreAllMocks())

  it('이름·주소·좌표가 일치한 관광정보의 대표 이미지만 반환한다', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(response([matchedItem]))))

    await expect(createProvider().findPhotos(target, 1)).resolves.toEqual([
      {
        id: 'tour:1:1',
        url: 'https://tong.visitkorea.or.kr/photo-1.jpg',
        width: null,
        height: null,
        source: PlacePhotoSource.Tour,
        attributions: [
          {
            displayName: '한국관광공사 · 공공누리 제1유형',
            uri: 'https://www.data.go.kr/data/15101578/openapi.do',
            photoUri: null,
          },
        ],
        googleMapsUri: null,
        flagContentUri: null,
      },
    ])

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]))
    expect(requestUrl.pathname.endsWith('/KorService2/searchKeyword2')).toBe(
      true,
    )
    expect(requestUrl.searchParams.get('keyword')).toBe('나의가야')
    expect(requestUrl.searchParams.get('serviceKey')).toBe('tour+key=')
  })

  it('매칭되지 않은 동명 장소 이미지는 사용하지 않는다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify(
            response([{ ...matchedItem, mapx: '127.15', mapy: '37.6' }]),
          ),
        ),
      )

    await expect(createProvider().findPhotos(target, 1)).resolves.toEqual([])
  })

  it('상세 화면에서는 중복을 제거한 추가 이미지를 함께 반환한다', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(response([matchedItem]))),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            response([
              {
                originimgurl: matchedItem.firstimage,
                smallimageurl: '',
                cpyrhtDivCd: 'Type1',
              },
              {
                originimgurl: 'https://tong.visitkorea.or.kr/photo-2.jpg',
                smallimageurl: '',
                cpyrhtDivCd: 'Type3',
              },
            ]),
          ),
        ),
      )

    const photos = await createProvider().findPhotos(target, 3)

    expect(photos).toHaveLength(2)
    expect(photos[1]).toMatchObject({
      url: 'https://tong.visitkorea.or.kr/photo-2.jpg',
      source: PlacePhotoSource.Tour,
      attributions: [
        expect.objectContaining({
          displayName: '한국관광공사 · 공공누리 제3유형',
        }),
      ],
    })
  })

  it('서비스 키가 없으면 외부 요청을 보내지 않는다', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    const provider = createProvider('')

    expect(provider.isConfigured()).toBe(false)
    await expect(provider.findPhotos(target, 1)).rejects.toBeInstanceOf(
      TourPlacePhotoProviderError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
