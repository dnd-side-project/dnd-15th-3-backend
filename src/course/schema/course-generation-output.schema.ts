import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { z } from 'zod'

const idString = z.string().regex(/^[1-9]\d*$/)

const generatedCourseCandidateSchema = z
  .object({
    name: z.string().trim().min(1).max(15),
    recommendationIds: z
      .array(idString)
      .min(1)
      .max(MAX_COURSE_STEPS)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: '한 코스에 같은 장소 추천을 중복할 수 없습니다',
      }),
  })
  .strict()

export const courseGenerationOutputSchema = z
  .object({
    schemaVersion: z.literal(1),
    provider: z.string().trim().min(1).max(50),
    model: z.string().trim().min(1).max(100),
    candidates: z
      .array(generatedCourseCandidateSchema)
      .min(1)
      .max(3)
      .refine(
        (candidates) =>
          new Set(
            candidates.map((candidate) =>
              candidate.recommendationIds.join(','),
            ),
          ).size === candidates.length,
        { message: '동일한 코스 후보를 중복할 수 없습니다' },
      ),
  })
  .strict()

export type CourseGenerationOutputSnapshot = z.infer<
  typeof courseGenerationOutputSchema
>
