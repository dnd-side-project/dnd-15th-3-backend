import { z } from 'zod'

export const kakaoLocalAddressSearchAnalyzeTypeSchema = z.enum([
  'similar',
  'exact',
])

export const kakaoLocalAddressSearchRequestSchema = z.object({
  query: z.string().trim().min(1, '주소 검색어를 입력해주세요.'),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
  analyze_type: kakaoLocalAddressSearchAnalyzeTypeSchema.default('similar'),
  page: z.coerce.number().int().min(1).max(45).default(1),
  size: z.coerce.number().int().min(1).max(30).default(10),
})

export type KakaoLocalAddressSearchRequest = z.infer<
  typeof kakaoLocalAddressSearchRequestSchema
>
