import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { z } from 'zod'

const idSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, 'ID는 양의 정수여야 합니다.')

export const placeSearchRequestSchema = z
  .object({
    meetingId: idSchema,
    accessToken: z.string().trim().min(1, '참여자 토큰을 입력해주세요.'),
    categoryId: idSchema.optional(),
    categorySlug: z.enum(CategorySlug).optional(),
    q: z
      .string()
      .trim()
      .max(100, '검색어는 100자 이하이어야 합니다.')
      .optional(),
    page: z.coerce
      .number()
      .int('페이지는 정수여야 합니다.')
      .min(1, '페이지는 1 이상이어야 합니다.')
      .default(1),
    size: z.coerce
      .number()
      .int('페이지 크기는 정수여야 합니다.')
      .min(1, '페이지 크기는 1 이상이어야 합니다.')
      .max(50, '페이지 크기는 50 이하이어야 합니다.')
      .default(20),
  })
  .refine((request) => !(request.categoryId && request.categorySlug), {
    path: ['categorySlug'],
    message: 'categoryId와 categorySlug는 동시에 사용할 수 없습니다.',
  })

export type PlaceSearchRequest = z.infer<typeof placeSearchRequestSchema>
