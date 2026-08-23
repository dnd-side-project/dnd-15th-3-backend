/* biome-ignore-all lint/style/useNamingConvention: Kakao 이미지 검색 API 응답 필드와 동일하게 유지 */
import { z } from 'zod'

export const kakaoImageSearchDocumentSchema = z.object({
  collection: z.string(),
  thumbnail_url: z.string(),
  image_url: z.string(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  display_sitename: z.string(),
  doc_url: z.string(),
  datetime: z.string(),
})

export const kakaoImageSearchResponseSchema = z.object({
  meta: z.object({
    total_count: z.number().int().nonnegative(),
    pageable_count: z.number().int().nonnegative(),
    is_end: z.boolean(),
  }),
  documents: z.array(kakaoImageSearchDocumentSchema),
})

export type KakaoImageSearchDocument = z.infer<
  typeof kakaoImageSearchDocumentSchema
>
