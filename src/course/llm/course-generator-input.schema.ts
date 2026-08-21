import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { z } from 'zod'

const enumValues = <T extends string>(values: readonly T[]) =>
  z.enum(values as [T, ...T[]])

const meetingTypeCodeSchema = enumValues(Object.values(MeetingTypeCode))
const categorySlugSchema = enumValues(Object.values(CategorySlug))

export const courseGeneratorInputSchema = z
  .strictObject({
    startNodeId: z.literal('start'),
    meetingType: meetingTypeCodeSchema,
    isWeekend: z.boolean(),
    qna: z
      .array(
        z.strictObject({
          question: z.string().min(1),
          answer: z.string().min(1),
        }),
      )
      .max(3)
      .default([]),
    visitOrder: z.array(categorySlugSchema).min(1).max(MAX_COURSE_STEPS),
    places: z
      .array(
        z.strictObject({
          id: z.string().min(1),
          name: z.string().min(1),
          category: categorySlugSchema,
          score: z.number().refine(Number.isFinite, {
            message: 'score는 유한한 숫자여야 합니다.',
          }),
          tags: z.array(z.string().min(1)).default([]),
        }),
      )
      .refine(
        (places) =>
          new Set(places.map((place) => place.id)).size === places.length,
        {
          message: '장소 id는 서로 달라야 합니다.',
        },
      ),
    distanceMatrix: z.strictObject({
      unit: z.literal('meter'),
      metric: z.literal('walking_network_distance'),
      directed: z.literal(true),
      values: z.record(
        z.string(),
        z.record(
          z.string(),
          z
            .number()
            .refine(Number.isFinite, {
              message: '거리는 유한한 숫자여야 합니다.',
            })
            .nonnegative(),
        ),
      ),
    }),
    strategyConfig: z
      .strictObject({
        balancedMaxDistanceRatio: z
          .number()
          .refine(Number.isFinite, {
            message: 'balancedMaxDistanceRatio는 유한한 숫자여야 합니다.',
          })
          .positive(),
        variationTopK: z.number().int().min(1).max(50).default(5),
        beamWidth: z.number().int().min(1).max(2_000).default(500),
        maxSearchStates: z.number().int().min(1).max(100_000).default(10_000),
      })
      .default({
        balancedMaxDistanceRatio: 1.2,
        variationTopK: 5,
        beamWidth: 500,
        maxSearchStates: 10_000,
      }),
  })
  .refine((data) => data.places.length >= data.visitOrder.length, {
    message: '장소 개수는 방문 순서 개수 이상이어야 합니다.',
    path: ['places'],
  })

export type CourseGeneratorInput = z.infer<typeof courseGeneratorInputSchema>

export function parseCourseGeneratorInput(raw: unknown): CourseGeneratorInput {
  return courseGeneratorInputSchema.parse(raw)
}
