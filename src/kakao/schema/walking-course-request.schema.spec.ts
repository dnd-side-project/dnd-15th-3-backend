import {
  kakaoWalkingCourseHeaderSchema,
  kakaoWalkingCourseRequestSchema,
} from './walking-course-request.schema'

describe('kakaoWalkingCourseHeaderSchema', () => {
  it('KakaoAK 접두사가 있으면 통과한다', () => {
    const result = kakaoWalkingCourseHeaderSchema.safeParse({
      // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
      Authorization: 'KakaoAK abcd1234',
    })

    expect(result.success).toBe(true)
  })

  it('KakaoAK 접두사가 없으면 실패한다', () => {
    const result = kakaoWalkingCourseHeaderSchema.safeParse({
      // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
      Authorization: 'abcd1234',
    })

    expect(result.success).toBe(false)
  })
})

describe('kakaoWalkingCourseRequestSchema', () => {
  const baseParams = {
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    start_x: '127.1',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    start_y: '37.5',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    end_x: '127.2',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    end_y: '37.6',
  }

  it('필수 파라미터만 있어도 통과한다', () => {
    const result = kakaoWalkingCourseRequestSchema.safeParse(baseParams)

    expect(result.success).toBe(true)
  })

  it('필수 파라미터가 없으면 실패한다', () => {
    const { start_x: _startX, ...rest } = baseParams
    const result = kakaoWalkingCourseRequestSchema.safeParse(rest)

    expect(result.success).toBe(false)
  })

  it('via_x와 via_y 개수가 같으면 통과한다', () => {
    const result = kakaoWalkingCourseRequestSchema.safeParse({
      ...baseParams,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      via_x: '127.1,127.2',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      via_y: '37.1,37.2',
    })

    expect(result.success).toBe(true)
  })

  it('via_x와 via_y 개수가 다르면 실패한다', () => {
    const result = kakaoWalkingCourseRequestSchema.safeParse({
      ...baseParams,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      via_x: '127.1,127.2,127.3',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      via_y: '37.1,37.2',
    })

    expect(result.success).toBe(false)
  })

  it('via_x가 6개를 초과하면 실패한다', () => {
    const result = kakaoWalkingCourseRequestSchema.safeParse({
      ...baseParams,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      via_x: '1,2,3,4,5,6',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      via_y: '1,2,3,4,5,6',
    })

    expect(result.success).toBe(false)
  })

  it('route_mode에 정의되지 않은 값을 넣으면 실패한다', () => {
    const result = kakaoWalkingCourseRequestSchema.safeParse({
      ...baseParams,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      route_mode: 'TEST',
    })

    expect(result.success).toBe(false)
  })
})
