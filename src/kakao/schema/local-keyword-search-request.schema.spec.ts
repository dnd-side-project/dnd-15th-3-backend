import { kakaoLocalKeywordSearchRequestSchema } from './local-keyword-search-request.schema'

describe('kakaoLocalKeywordSearchRequestSchema', () => {
  it('검색어를 정리하고 기본 페이지 값을 채운다', () => {
    expect(
      kakaoLocalKeywordSearchRequestSchema.parse({
        query: ' 강남역 2번출구 ',
      }),
    ).toEqual({
      query: '강남역 2번출구',
      page: 1,
      size: 10,
    })
  })

  it('빈 검색어와 Kakao 제한을 벗어난 페이지 크기를 거부한다', () => {
    expect(
      kakaoLocalKeywordSearchRequestSchema.safeParse({ query: ' ' }).success,
    ).toBe(false)
    expect(
      kakaoLocalKeywordSearchRequestSchema.safeParse({
        query: '강남역',
        size: 16,
      }).success,
    ).toBe(false)
  })
})
