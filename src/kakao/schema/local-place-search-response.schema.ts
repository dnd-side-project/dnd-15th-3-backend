/* biome-ignore-all lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지 */
import { z } from 'zod'

export const kakaoPlaceDocumentSchema = z.object({
  id: z.string().trim().min(1),
  place_name: z.string().trim().min(1),
  category_name: z.string(),
  category_group_code: z.string(),
  category_group_name: z.string(),
  phone: z.string(),
  address_name: z.string(),
  road_address_name: z.string(),
  x: z.string().trim().min(1),
  y: z.string().trim().min(1),
  place_url: z.string(),
  distance: z.string(),
})

export const kakaoPlaceSearchResponseSchema = z.object({
  meta: z.object({
    total_count: z.number().int().nonnegative(),
    pageable_count: z.number().int().nonnegative(),
    is_end: z.boolean(),
  }),
  documents: z.array(kakaoPlaceDocumentSchema),
})

export type KakaoPlaceDocument = z.infer<typeof kakaoPlaceDocumentSchema>
export type KakaoPlaceSearchResponse = z.infer<
  typeof kakaoPlaceSearchResponseSchema
>
