import { CourseGenerationRouteService } from './course-generation-route.service'

const recommendations = [
  { latitude: 37.5, longitude: 127 },
  { latitude: 37.501, longitude: 127.001 },
] as never

describe('CourseGenerationRouteService', () => {
  it('카카오 도보 경로가 있으면 실제 시간과 거리를 저장한다', async () => {
    const kakaoWalkingCourseService = {
      getWalkingCourse: jest.fn().mockResolvedValue({
        status: 'OK',
        route: {
          properties: { totalTime: 240, totalDistance: 300 },
        },
      }),
    }
    const service = new CourseGenerationRouteService(
      kakaoWalkingCourseService as never,
    )

    await expect(service.getLegs(recommendations)).resolves.toEqual([
      { travelTimeToNext: 240, distanceToNextMeters: 300 },
      { travelTimeToNext: null, distanceToNextMeters: null },
    ])
  })

  it('카카오 도보 경로를 사용할 수 없어도 직선거리 기반 추정치로 생성을 계속한다', async () => {
    const kakaoWalkingCourseService = {
      getWalkingCourse: jest.fn().mockRejectedValue(new Error('unavailable')),
    }
    const service = new CourseGenerationRouteService(
      kakaoWalkingCourseService as never,
    )

    const result = await service.getLegs(recommendations)

    expect(result[0].distanceToNextMeters).toBeGreaterThan(0)
    expect(result[0].travelTimeToNext).toBeGreaterThan(0)
    expect(result[1]).toEqual({
      travelTimeToNext: null,
      distanceToNextMeters: null,
    })
  })
})
