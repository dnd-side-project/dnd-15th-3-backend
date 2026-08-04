import { z } from 'zod'

// 카카오 도보 경로 API 문서에 정의된 status 값
const kakaoWalkingCourseStatusSchema = z.enum([
  'OK',
  'SAME_POINT',
  'START_LINK_NOT_FOUND',
  'END_LINK_NOT_FOUND',
  'TOO_MANY_SEARCH_LINK',
  'TOO_FAR_AWAY',
  'ROUTE_RESULT_NOT_FOUND',
])

// Leg: 경로를 구성하는 개별 구간
const legPropertiesSchema = z.object({
  distance: z.number(), // Unit: meters
  time: z.number(), // Unit: seconds
})

const legSchema = z.object({
  properties: legPropertiesSchema,
})

// Route: 여러 Leg로 구성된 전체 경로
const routePropertiesSchema = z.object({
  totalDistance: z.number(), // Unit: meters
  totalTime: z.number(), // Unit: seconds
})

const routeSchema = z.object({
  properties: routePropertiesSchema,
  legs: z.array(legSchema),
})

// Response(status가 OK일 때만 route 포함)
export const kakaoWalkingCourseResponseSchema = z
  .object({
    status: kakaoWalkingCourseStatusSchema,
    route: routeSchema.optional(),
  })
  .refine((data) => {
    const isOk = data.status === 'OK'
    const hasRoute = data.route !== undefined
    return isOk === hasRoute
  }, 'status가 OK일 때만 route 정보가 있어야 합니다1')

export type KakaoWalkingCourseResponse = z.infer<
  typeof kakaoWalkingCourseResponseSchema
>
