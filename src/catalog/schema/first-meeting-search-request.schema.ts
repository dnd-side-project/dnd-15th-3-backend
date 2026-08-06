import { z } from 'zod'

export const firstMeetingSearchRequestSchema = z.object({
  // q가 한글 자모 한 글자여도 검색할 수 있도록 최소 길이만 검증
  q: z.string().trim().min(1, '검색어를 입력해주세요.'),
})

export type FirstMeetingSearchRequest = z.infer<
  typeof firstMeetingSearchRequestSchema
>
