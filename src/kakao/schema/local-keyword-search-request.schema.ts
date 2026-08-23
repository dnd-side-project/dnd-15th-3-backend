import { z } from 'zod'

export const kakaoLocalKeywordSearchRequestSchema = z.object({
  query: z.string().trim().min(1, '장소 검색어를 입력해주세요.'),
  page: z.coerce.number().int().min(1).max(45).default(1),
  size: z.coerce.number().int().min(1).max(15).default(10),
})

export type KakaoLocalKeywordSearchRequest = z.infer<
  typeof kakaoLocalKeywordSearchRequestSchema
>
