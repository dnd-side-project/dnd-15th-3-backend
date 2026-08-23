import type { KakaoWalkingDistanceService } from 'src/kakao/kakao-walking-distance.service'
import { CourseGenerationRouteService } from './course-generation-route.service'

const recommendations = [
  { latitude: 37.5, longitude: 127 },
  { latitude: 37.501, longitude: 127.001 },
] as never

function createService(getWalkingDistance: jest.Mock) {
  return new CourseGenerationRouteService({
    getWalkingDistance,
  } as unknown as KakaoWalkingDistanceService)
}

describe('CourseGenerationRouteService', () => {
  it('연속된 장소 쌍마다 거리를 조회하고 마지막 구간은 null로 채운다', async () => {
    const getWalkingDistance = jest.fn().mockResolvedValue({
      distanceMeters: 300,
      travelTimeSeconds: 240,
      isEstimated: false,
    })
    const service = createService(getWalkingDistance)

    const legs = await service.getLegs(recommendations)

    expect(getWalkingDistance).toHaveBeenCalledTimes(1)
    expect(getWalkingDistance).toHaveBeenCalledWith(
      recommendations[0],
      recommendations[1],
    )
    expect(legs).toEqual([
      { travelTimeToNext: 240, distanceToNextMeters: 300 },
      { travelTimeToNext: null, distanceToNextMeters: null },
    ])
  })

  it('추정치(isEstimated)여도 그대로 거리·시간에 반영한다', async () => {
    const getWalkingDistance = jest.fn().mockResolvedValue({
      distanceMeters: 132,
      travelTimeSeconds: 110,
      isEstimated: true,
    })
    const service = createService(getWalkingDistance)

    const legs = await service.getLegs(recommendations)

    expect(legs[0]).toEqual({
      travelTimeToNext: 110,
      distanceToNextMeters: 132,
    })
  })
})
