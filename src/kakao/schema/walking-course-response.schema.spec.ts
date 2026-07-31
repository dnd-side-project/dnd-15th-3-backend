import { kakaoWalkingCourseResponseSchema } from './walking-course-response.schema'

describe('kakaoWalkingCourseResponseSchema', () => {
  const validRoute = {
    properties: { totalDistance: 500, totalTime: 400 },
    legs: [{ properties: { distance: 500, time: 400 } }],
  }

  it('status가 OK이고 route가 있으면 통과한다', () => {
    const result = kakaoWalkingCourseResponseSchema.safeParse({
      status: 'OK',
      route: validRoute,
    })

    expect(result.success).toBe(true)
  })

  it('status가 OK인데 route가 없으면 실패한다', () => {
    const result = kakaoWalkingCourseResponseSchema.safeParse({
      status: 'OK',
    })

    expect(result.success).toBe(false)
  })

  it('status가 OK가 아니고 route도 없으면 통과한다', () => {
    const result = kakaoWalkingCourseResponseSchema.safeParse({
      status: 'ROUTE_NOT_FOUND',
    })

    expect(result.success).toBe(true)
  })

  it('status가 OK가 아닌데 route가 있어도 통과한다', () => {
    const result = kakaoWalkingCourseResponseSchema.safeParse({
      status: 'ROUTE_NOT_FOUND',
      route: validRoute,
    })

    expect(result.success).toBe(true)
  })
})
