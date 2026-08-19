import { kakaoLocalAddressSearchResponseSchema } from './local-address-search-response.schema'

describe('kakaoLocalAddressSearchResponseSchema', () => {
  const validAddress = {
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    address_name: '서울 강남구 역삼동 123-4',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    region_1depth_name: '서울',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    region_2depth_name: '강남구',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    region_3depth_name: '역삼동',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    region_3depth_h_name: '역삼1동',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    h_code: '1168064000',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    b_code: '1168010100',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    mountain_yn: 'N',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    main_address_no: '123',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    sub_address_no: '4',
    x: '127.0365001',
    y: '37.5012002',
  }

  const validRoadAddress = {
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    address_name: '서울 강남구 테헤란로 123',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    region_1depth_name: '서울',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    region_2depth_name: '강남구',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    region_3depth_name: '역삼동',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    road_name: '테헤란로',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    underground_yn: 'N',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    main_building_no: '123',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    sub_building_no: '',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    building_name: '테스트빌딩',
    // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
    zone_no: '06130',
    x: '127.0365001',
    y: '37.5012002',
  }

  const validResponse = {
    meta: {
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      total_count: 1,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      pageable_count: 1,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
      is_end: true,
    },
    documents: [
      {
        // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
        address_name: '서울 강남구 역삼동 123-4',
        // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
        address_type: 'ROAD_ADDR',
        x: '127.0365001',
        y: '37.5012002',
        address: validAddress,
        // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
        road_address: validRoadAddress,
      },
    ],
  }

  it('주소 검색 성공 응답을 통과한다', () => {
    const result =
      kakaoLocalAddressSearchResponseSchema.safeParse(validResponse)

    expect(result.success).toBe(true)
  })

  it('주소와 도로명주소가 null인 지역 검색 결과를 통과한다', () => {
    const result = kakaoLocalAddressSearchResponseSchema.safeParse({
      meta: {
        // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
        total_count: 1,
        // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
        pageable_count: 1,
        // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
        is_end: true,
      },
      documents: [
        {
          // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
          address_name: '서울 강남구',
          // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
          address_type: 'REGION',
          x: '127.0276',
          y: '37.4979',
          address: null,
          // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
          road_address: null,
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('정의되지 않은 address_type이면 실패한다', () => {
    const result = kakaoLocalAddressSearchResponseSchema.safeParse({
      ...validResponse,
      documents: [
        {
          ...validResponse.documents[0],
          // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
          address_type: 'BUILDING',
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('좌표가 숫자 문자열이 아니면 실패한다', () => {
    const result = kakaoLocalAddressSearchResponseSchema.safeParse({
      ...validResponse,
      documents: [
        {
          ...validResponse.documents[0],
          x: 'not-a-coordinate',
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('meta 필드가 없으면 실패한다', () => {
    const result = kakaoLocalAddressSearchResponseSchema.safeParse({
      documents: [],
    })

    expect(result.success).toBe(false)
  })
})
