import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { z } from 'zod'
import {
  buildCourseRoutePlan,
  COURSE_STRATEGIES,
  type CourseRoutePlan,
  calculateRouteMetrics,
} from './course-generator.planner'
import type { CourseGeneratorInput } from './course-generator-input.schema'

const COURSE_NAME_MIN_LENGTH = 5
const COURSE_NAME_MAX_LENGTH = 10

const categorySlugSchema = z.enum(
  Object.values(CategorySlug) as [CategorySlug, ...CategorySlug[]],
)

const coursePlaceSchema = z.strictObject({
  placeId: z.string().min(1),
  order: z.number().int().positive(),
  category: categorySlugSchema,
})

const courseRouteSchema = z.strictObject({
  routeId: z.number().int().positive(),
  name: z
    .string()
    .min(COURSE_NAME_MIN_LENGTH)
    .max(COURSE_NAME_MAX_LENGTH)
    .refine((name) => name.trim().length > 0, {
      message: '코스 이름은 공백만으로 구성될 수 없습니다.',
    }),
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
    name: string
    places: {
      placeId: string
      order: number
      category: CategorySlug
    }[]
  }[]
}

export function createCourseGeneratorOutputSchema(
  input: CourseGeneratorInput,
  plan: CourseRoutePlan = buildCourseRoutePlan(input),
  options: { expectedRouteCount?: number } = {},
): z.ZodType<CourseGeneratorOutput> {
  const candidateIds = new Set(input.places.map((place) => place.id))
  const candidatePlaces = new Map(
    input.places.map((place) => [place.id, place]),
  )
  const visitOrder = input.visitOrder

  return z
    .strictObject({
      routes: z.array(courseRouteSchema),
    })
    .superRefine((value, ctx) => {
      const { routes } = value

      const expectedRouteCount = options.expectedRouteCount
      if (
        (expectedRouteCount !== undefined &&
          routes.length !== expectedRouteCount) ||
        (expectedRouteCount === undefined &&
          (routes.length < 1 || routes.length > COURSE_STRATEGIES.length))
      ) {
        ctx.addIssue({
          code: 'custom',
          message:
            expectedRouteCount === undefined
              ? `routes는 1개 이상 ${COURSE_STRATEGIES.length}개 이하여야 합니다.`
              : `routes는 ${expectedRouteCount}개여야 합니다.`,
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
          } else if (
            candidatePlaces.get(place.placeId)?.category !== place.category
          ) {
            ctx.addIssue({
              code: 'custom',
              message: `placeId ${place.placeId}의 카테고리와 출력 category가 일치하지 않습니다.`,
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

      for (const [routeIndex, route] of routes.entries()) {
        const placeIds = route.places.map((place) => place.placeId)
        const verified = calculateRouteMetrics(placeIds, input)

        if (!verified) {
          ctx.addIssue({
            code: 'custom',
            message: `${routeIndex + 1}번째 코스가 서버 데이터로 검증되지 않는 경로입니다.`,
          })
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

      const names = routes.map((route) => route.name.trim())
      if (new Set(names).size !== names.length) {
        ctx.addIssue({
          code: 'custom',
          message: '코스 이름은 서로 달라야 합니다.',
        })
      }
    })
}
