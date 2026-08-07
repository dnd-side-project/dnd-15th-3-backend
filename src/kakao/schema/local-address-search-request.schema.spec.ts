import { kakaoLocalAddressSearchRequestSchema } from './local-address-search-request.schema'

describe('kakaoLocalAddressSearchRequestSchema', () => {
  it('query만 있으면 카카오 API 기본값을 적용해 통과한다', () => {
    const result = kakaoLocalAddressSearchRequestSchema.safeParse({
      query: '  서울 강남구  ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        query: '서울 강남구',
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        analyze_type: 'similar',
        page: 1,
        size: 10,
      })
    }
  })

  it('문자열로 전달된 page와 size를 숫자로 변환한다', () => {
    const result = kakaoLocalAddressSearchRequestSchema.safeParse({
      query: '서울 강남구',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      analyze_type: 'exact',
      page: '2',
      size: '20',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.size).toBe(20)
    }
  })

  it('query가 비어 있으면 실패한다', () => {
    const result = kakaoLocalAddressSearchRequestSchema.safeParse({
      query: '   ',
    })

    expect(result.success).toBe(false)
  })

  it('analyze_type에 정의되지 않은 값을 넣으면 실패한다', () => {
    const result = kakaoLocalAddressSearchRequestSchema.safeParse({
      query: '서울 강남구',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      analyze_type: 'contains',
    })

    expect(result.success).toBe(false)
  })

  it('page와 size가 카카오 API 범위를 벗어나면 실패한다', () => {
    const invalidPage = kakaoLocalAddressSearchRequestSchema.safeParse({
      query: '서울 강남구',
      page: 46,
    })
    const invalidSize = kakaoLocalAddressSearchRequestSchema.safeParse({
      query: '서울 강남구',
      size: 31,
    })

    expect(invalidPage.success).toBe(false)
    expect(invalidSize.success).toBe(false)
  })
})
