import { z } from 'zod'

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
    status: z.string(),
    route: routeSchema.optional(),
  })
  .refine((data) => !(data.status === 'OK' && data.route === undefined), {
    message: 'status가 OK인데 route 정보가 없습니다',
  })

export type KakaoWalkingCourseResponse = z.infer<
  typeof kakaoWalkingCourseResponseSchema
>
