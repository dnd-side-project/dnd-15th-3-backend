import { BadRequestException } from '@nestjs/common'
import { KakaoLocalService } from 'src/kakao/kakao-local.service'
import { PlaceController } from './place.controller'
import { PlaceService } from './place.service'

describe('PlaceController', () => {
  it('검색 요청을 검증하고 기본 페이지 값을 서비스에 전달한다', () => {
    const placeService = {
      searchPlaces: jest.fn().mockResolvedValue({ items: [] }),
    }
    const kakaoLocal = { searchAddressPlaces: jest.fn() }
    const controller = new PlaceController(
      placeService as unknown as PlaceService,
      kakaoLocal as unknown as KakaoLocalService,
    )

    controller.search({ meetingId: '123', accessToken: 'token' })

    expect(placeService.searchPlaces).toHaveBeenCalledWith({
      meetingId: '123',
      accessToken: 'token',
      page: 1,
      size: 20,
    })
  })

  it('참여자 토큰이 없으면 외부나 DB 조회 없이 실패한다', () => {
    const placeService = { searchPlaces: jest.fn() }
    const controller = new PlaceController(
      placeService as unknown as PlaceService,
      { searchAddressPlaces: jest.fn() } as unknown as KakaoLocalService,
    )

    expect(() => controller.search({ meetingId: '123' })).toThrow(
      BadRequestException,
    )
    expect(placeService.searchPlaces).not.toHaveBeenCalled()
  })

  it('첫 만남 위치 검색은 Kakao 주소 서비스에 위임한다', async () => {
    const kakaoLocal = { searchAddressPlaces: jest.fn().mockResolvedValue([]) }
    const controller = new PlaceController(
      { searchPlaces: jest.fn() } as unknown as PlaceService,
      kakaoLocal as unknown as KakaoLocalService,
    )

    await controller.searchFirstMeetingPlaces('강남')

    expect(kakaoLocal.searchAddressPlaces).toHaveBeenCalledWith({
      query: '강남',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      analyze_type: 'similar',
      page: 1,
      size: 10,
    })
  })
})
