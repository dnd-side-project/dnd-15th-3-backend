import { firstMeetingSearchRequestSchema } from './first-meeting-search-request.schema'

describe('firstMeetingSearchRequestSchema', () => {
  it.each(['ㄱ', 'ㅏ', 'ㅇ', 'ㄴ', 'ㅏ', 'ㅁ'])(
    '한글 입력 중인 자모 %s도 검색어로 통과한다',
    (q) => {
      const result = firstMeetingSearchRequestSchema.safeParse({ q })

      expect(result.success).toBe(true)
    },
  )

  it('검색어의 앞뒤 공백을 제거한다', () => {
    const result = firstMeetingSearchRequestSchema.safeParse({ q: ' 강남 ' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBe('강남')
    }
  })

  it('검색어가 비어 있으면 실패한다', () => {
    const result = firstMeetingSearchRequestSchema.safeParse({ q: '   ' })

    expect(result.success).toBe(false)
  })
})
