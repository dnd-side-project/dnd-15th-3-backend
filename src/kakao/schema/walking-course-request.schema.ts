import { z } from 'zod'

const coordinateSystemSchema = z.enum(['WGS84', 'WTM', 'TM', 'WCONGNAMUL'])

// 카카오 도보 경로 API의 경유지(via_x/via_y/v_name)는 최대 5개까지 쉼표로 구분해 전달
const MAX_WAYPOINT_COUNT = 5

// 경도/위도를 나타내는 숫자 정규 표현식
const COORDINATE_PATTERN = /^-?\d+(\.\d+)?$/

const hasAtMostMaxWaypoints = (value: string) =>
  value.split(',').length <= MAX_WAYPOINT_COUNT

const hasNoEmptyWaypoint = (value: string) =>
  value.split(',').every((part) => part.trim().length > 0)

const isValidCoordinate = (value: string) =>
  COORDINATE_PATTERN.test(value.trim())

const hasOnlyValidCoordinates = (value: string) =>
  value.split(',').every((part) => isValidCoordinate(part))

export const kakaoWalkingCourseHeaderSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
  Authorization: z
    .string()
    .startsWith('KakaoAK ')
    .refine(
      (value) => value.slice('KakaoAK '.length).trim().length > 0,
      'KakaoAK 뒤에 실제 REST API 키가 있어야 합니다',
    ),
})

export type KakaoWalkingCourseHeader = z.infer<
  typeof kakaoWalkingCourseHeaderSchema
>

export const kakaoWalkingCourseRequestSchema = z
  .object({
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    start_x: z
      .string()
      .refine(isValidCoordinate, '시작 X 좌표는 숫자 형식이어야 합니다'),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    start_y: z
      .string()
      .refine(isValidCoordinate, '시작 Y 좌표는 숫자 형식이어야 합니다'),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    via_x: z
      .string()
      .refine(
        hasAtMostMaxWaypoints,
        '경유지 X 좌표는 최대 5개까지 입력해야 합니다',
      )
      .refine(hasNoEmptyWaypoint, '경유지 X 좌표에 빈 값이 있으면 안 됩니다')
      .refine(hasOnlyValidCoordinates, '경유지 X 좌표는 숫자 형식이어야 합니다')
      .optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    via_y: z
      .string()
      .refine(
        hasAtMostMaxWaypoints,
        '경유지 Y 좌표는 최대 5개까지 입력해야 합니다',
      )
      .refine(hasNoEmptyWaypoint, '경유지 Y 좌표에 빈 값이 있으면 안 됩니다')
      .refine(hasOnlyValidCoordinates, '경유지 Y 좌표는 숫자 형식이어야 합니다')
      .optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    end_x: z
      .string()
      .refine(isValidCoordinate, '도착 X 좌표는 숫자 형식이어야 합니다'),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    end_y: z
      .string()
      .refine(isValidCoordinate, '도착 Y 좌표는 숫자 형식이어야 합니다'),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    s_name: z.string().optional(),
    // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
    v_name: z
      .string()
      .refine(
        hasAtMostMaxWaypoints,
        '경유지 명칭은 최대 5개까지 입력해야 합니다',
      )
      .refine(hasNoEmptyWaypoint, '경유지 명칭에 빈 값이 있으면 안 됩니다')
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
    'via_x와 via_y의 좌표 개수가 일치해야 합니다',
  )

export type KakaoWalkingCourseRequest = z.infer<
  typeof kakaoWalkingCourseRequestSchema
>
