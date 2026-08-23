import type { KakaoWalkingCourseService } from './kakao-walking-course.service'
import { KakaoWalkingDistanceService } from './kakao-walking-distance.service'

const origin = { latitude: 37.5, longitude: 127 }
const destination = { latitude: 37.501, longitude: 127.001 }

function createService(kakaoWalkingCourseService: {
  getWalkingCourse: jest.Mock
}) {
  return new KakaoWalkingDistanceService(
    kakaoWalkingCourseService as unknown as KakaoWalkingCourseService,
  )
}

describe('KakaoWalkingDistanceService', () => {
  it('카카오 도보 경로가 있으면 실제 시간과 거리를 반환한다', async () => {
    const kakaoWalkingCourseService = {
      getWalkingCourse: jest.fn().mockResolvedValue({
        status: 'OK',
        route: { properties: { totalTime: 240, totalDistance: 300 } },
      }),
    }
    const service = createService(kakaoWalkingCourseService)

    await expect(
      service.getWalkingDistance(origin, destination),
    ).resolves.toEqual({
      distanceMeters: 300,
      travelTimeSeconds: 240,
      isEstimated: false,
    })
  })

  it('카카오 API 호출이 실패하면 직선거리 기반 추정치로 대체한다', async () => {
    const kakaoWalkingCourseService = {
      getWalkingCourse: jest.fn().mockRejectedValue(new Error('unavailable')),
    }
    const service = createService(kakaoWalkingCourseService)

    const result = await service.getWalkingDistance(origin, destination)

    expect(result.isEstimated).toBe(true)
    expect(result.distanceMeters).toBeGreaterThan(0)
    expect(result.travelTimeSeconds).toBeGreaterThan(0)
  })

  it('경로를 찾지 못해도(ROUTE_RESULT_NOT_FOUND 등) 직선거리 기반 추정치로 대체한다', async () => {
    const kakaoWalkingCourseService = {
      getWalkingCourse: jest
        .fn()
        .mockResolvedValue({ status: 'ROUTE_RESULT_NOT_FOUND' }),
    }
    const service = createService(kakaoWalkingCourseService)

    const result = await service.getWalkingDistance(origin, destination)

    expect(result.isEstimated).toBe(true)
    expect(result.distanceMeters).toBeGreaterThan(0)
    expect(result.travelTimeSeconds).toBeGreaterThan(0)
  })
})
