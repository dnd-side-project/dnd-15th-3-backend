import { PlacePhotoMatchStatus } from '../enums/place-photo-match-status.enum'
import { PlaceSource } from '../enums/place-source.enum'
import type {
  GooglePlacePhotoCandidate,
  PlacePhotoTarget,
} from './place-photo.types'
import { selectGooglePlacePhotoMatch } from './place-photo-matcher'

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

function candidate(
  overrides: Partial<GooglePlacePhotoCandidate> = {},
): GooglePlacePhotoCandidate {
  return {
    id: 'google-1',
    name: '나의가야',
    address: '대한민국 서울특별시 강남구 역삼로69길 5',
    latitude: 37.50801,
    longitude: 127.05001,
    phone: '02-1234-5678',
    photos: [],
    ...overrides,
  }
}

describe('selectGooglePlacePhotoMatch', () => {
  it('이름·주소·좌표·전화번호가 일치하는 업체를 선택한다', () => {
    expect(selectGooglePlacePhotoMatch(target, [candidate()])).toMatchObject({
      status: PlacePhotoMatchStatus.Matched,
      candidate: { id: 'google-1' },
      confidence: 1,
    })
  })

  it('지점명이 붙어도 주소와 좌표가 일치하면 같은 업체로 선택한다', () => {
    expect(
      selectGooglePlacePhotoMatch(target, [
        candidate({ name: '나의가야 삼성점', phone: null }),
      ]),
    ).toMatchObject({
      status: PlacePhotoMatchStatus.Matched,
      candidate: { id: 'google-1' },
    })
  })

  it('이름이 다르면 같은 건물에 있어도 선택하지 않는다', () => {
    expect(
      selectGooglePlacePhotoMatch(target, [candidate({ name: '다른 식당' })]),
    ).toEqual({
      status: PlacePhotoMatchStatus.NotFound,
      candidate: null,
      confidence: null,
    })
  })

  it('좌표가 75m보다 멀면 이름과 주소가 같아도 선택하지 않는다', () => {
    expect(
      selectGooglePlacePhotoMatch(target, [
        candidate({ latitude: 37.509, longitude: 127.05 }),
      ]),
    ).toMatchObject({
      status: PlacePhotoMatchStatus.NotFound,
      candidate: null,
    })
  })

  it('두 후보의 신뢰도 차이가 작으면 사진을 선택하지 않는다', () => {
    expect(
      selectGooglePlacePhotoMatch(target, [
        candidate({ id: 'google-1' }),
        candidate({ id: 'google-2', longitude: 127.05002 }),
      ]),
    ).toMatchObject({
      status: PlacePhotoMatchStatus.Ambiguous,
      candidate: null,
    })
  })

  it('양쪽 전화번호가 명확히 다르면 선택하지 않는다', () => {
    expect(
      selectGooglePlacePhotoMatch(target, [
        candidate({ phone: '02-8765-4321' }),
      ]),
    ).toMatchObject({
      status: PlacePhotoMatchStatus.NotFound,
      candidate: null,
    })
  })
})
