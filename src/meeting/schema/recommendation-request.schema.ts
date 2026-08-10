import { z } from 'zod'

export const addRecommendationRequestSchema = z.object({
  placeId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, '장소 ID는 양의 정수여야 합니다.'),
})

export type AddRecommendationRequest = z.infer<
  typeof addRecommendationRequestSchema
>
