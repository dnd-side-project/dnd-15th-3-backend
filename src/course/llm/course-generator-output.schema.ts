import { z } from 'zod'
import type { CourseGeneratorInput } from './course-generator-input.schema'

const coursePlaceSchema = z.strictObject({
  placeId: z.number().int().positive(),
  order: z.number().int().positive(),
  category: z.string().min(1),
})

const courseRouteSchema = z.strictObject({
  routeId: z.number().int().positive(),
  strategy: z.string().min(1),
  places: z.array(coursePlaceSchema).refine(
    (places) => {
      const ids = places.map((place) => place.placeId)
      return new Set(ids).size === ids.length
    },
    { message: '한 코스 내에 중복된 장소가 존재합니다.' },
  ),
})

export type CourseGeneratorOutput = {
  routes: {
    routeId: number
    strategy: string
    places: {
      placeId: number
      order: number
      category: string
    }[]
  }[]
}

export function createCourseGeneratorOutputSchema(
  input: CourseGeneratorInput,
): z.ZodType<CourseGeneratorOutput> {
  const candidateIds = new Set(input.places.map((place) => place.id))
  const visitOrder = input.visitOrder

  return z
    .strictObject({
      routes: z.array(courseRouteSchema),
    })
    .superRefine((value, ctx) => {
      const { routes } = value

      if (routes.length < 1 || routes.length > 3) {
        ctx.addIssue({
          code: 'custom',
          message: 'routes는 1개 이상 3개 이하여야 합니다.',
        })
        return
      }

      for (const [routeIndex, route] of routes.entries()) {
        if (route.places.length !== visitOrder.length) {
          ctx.addIssue({
            code: 'custom',
            message: `${routeIndex + 1}번째 코스의 places 개수(${route.places.length})가 visitOrder(${visitOrder.length})와 일치하지 않습니다.`,
          })
          continue
        }

        for (const [placeIndex, place] of route.places.entries()) {
          if (place.category !== visitOrder[placeIndex]) {
            ctx.addIssue({
              code: 'custom',
              message: `${routeIndex + 1}번째 코스 ${placeIndex + 1}번째 장소의 카테고리가 ${place.category}(기대: ${visitOrder[placeIndex]})입니다.`,
            })
          }
          if (!candidateIds.has(place.placeId)) {
            ctx.addIssue({
              code: 'custom',
              message: `placeId ${place.placeId}는 후보 목록에 존재하지 않습니다.`,
            })
          }
          if (place.order !== placeIndex + 1) {
            ctx.addIssue({
              code: 'custom',
              message: `${routeIndex + 1}번째 코스의 order가 순차적이지 않습니다. ${placeIndex + 1}번째 위치에 ${place.order}.`,
            })
          }
        }
      }

      const compositions = routes.map((route) =>
        route.places
          .map((place) => place.placeId)
          .sort()
          .join(','),
      )
      for (let i = 1; i < compositions.length; i += 1) {
        for (let j = 0; j < i; j += 1) {
          if (compositions[i] === compositions[j]) {
            ctx.addIssue({
              code: 'custom',
              message: `${j + 1}번째와 ${i + 1}번째 코스의 장소 구성이 동일합니다.`,
            })
          }
        }
      }

      const routeIdsSequential = routes.every(
        (route, index) => route.routeId === index + 1,
      )
      if (!routeIdsSequential) {
        ctx.addIssue({
          code: 'custom',
          message: 'routeId는 1부터 순차적이어야 합니다.',
        })
      }

      const strategies = routes.map((route) => route.strategy)
      if (new Set(strategies).size !== strategies.length) {
        ctx.addIssue({
          code: 'custom',
          message: '전략(strategy)은 서로 달라야 합니다.',
        })
      }
    })
}
