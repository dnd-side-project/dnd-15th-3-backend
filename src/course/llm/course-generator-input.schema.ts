import { z } from 'zod'

export const courseGeneratorInputSchema = z.object({
  startLocation: z.strictObject({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  visitOrder: z.array(z.string().min(1)),
  places: z
    .array(
      z.strictObject({
        id: z.number().int().positive(),
        name: z.string().min(1),
        category: z.string().min(1),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        likeCount: z.number().int().min(0),
        dislikeCount: z.number().int().min(0),
        score: z.number(),
      }),
    )
    .refine(
      (places) =>
        new Set(places.map((place) => place.id)).size === places.length,
      {
        message: '장소 id는 서로 달라야 합니다.',
      },
    ),
  meetingStartTime: z.string().min(1),
  travelMode: z.string().min(1),
})

export type CourseGeneratorInput = z.infer<typeof courseGeneratorInputSchema>

export function parseCourseGeneratorInput(raw: unknown): CourseGeneratorInput {
  return courseGeneratorInputSchema.parse(raw)
}
