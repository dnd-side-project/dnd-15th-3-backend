import { z } from 'zod'

const coordinateSystemSchema = z.enum(['WGS84', 'WTM', 'TM', 'WCONGNAMUL'])

// 카카오 도보 경로 API의 경유지(via_x/via_y/v_name)는 최대 5개까지 쉼표로 구분해 전달
const isValidCommaSeparatedList = (value: string) => {
  const parts = value.split(',')
  return parts.length <= 5 && parts.every((part) => part.length > 0)
}

export const kakaoWalkingCourseHeaderSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
  Authorization: z.string().startsWith('KakaoAK '),
})

export type KakaoWalkingCourseHeader = z.infer<
  typeof kakaoWalkingCourseHeaderSchema
>

export const kakaoWalkingCourseRequestSchema = z
  .object({
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    start_x: z.string(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    start_y: z.string(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    via_x: z
      .string()
      .refine(
        isValidCommaSeparatedList,
        '경유지 X 좌표는 빈 값 없이 쉼표로 구분해 최대 5개까지 입력해야 합니다',
      )
      .optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    via_y: z
      .string()
      .refine(
        isValidCommaSeparatedList,
        '경유지 Y 좌표는 빈 값 없이 쉼표로 구분해 최대 5개까지 입력해야 합니다',
      )
      .optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    end_x: z.string(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    end_y: z.string(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    s_name: z.string().optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    v_name: z
      .string()
      .refine(
        isValidCommaSeparatedList,
        '경유지 명칭은 빈 값 없이 쉼표로 구분해 최대 5개까지 입력해야 합니다',
      )
      .optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    e_name: z.string().optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    input_coord: coordinateSystemSchema.optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    output_coord: coordinateSystemSchema.optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    route_mode: z.enum(['BROAD_FIRST', 'SHORTEST', 'ACCESSIBLE']).optional(),
  })
  .refine(
    (data) => data.via_x?.split(',').length === data.via_y?.split(',').length,
    {
      message: 'via_x와 via_y의 좌표 개수가 일치해야 합니다',
    },
  )

export type KakaoWalkingCourseRequest = z.infer<
  typeof kakaoWalkingCourseRequestSchema
>
