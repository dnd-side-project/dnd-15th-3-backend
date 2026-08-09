import { z } from 'zod'

const COORDINATE_PATTERN = /^-?\d+(\.\d+)?$/

const coordinateStringSchema = z
  .string()
  .refine(
    (value) => COORDINATE_PATTERN.test(value),
    '좌표는 숫자 형식이어야 합니다',
  )

const kakaoLocalYesNoSchema = z.enum(['Y', 'N'])

export const kakaoLocalAddressTypeSchema = z.enum([
  'REGION',
  'ROAD',
  'REGION_ADDR',
  'ROAD_ADDR',
])

const kakaoLocalAddressDetailSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  address_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  region_1depth_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  region_2depth_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  region_3depth_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  region_3depth_h_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  h_code: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  b_code: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  mountain_yn: kakaoLocalYesNoSchema,
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  main_address_no: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  sub_address_no: z.string(),
  x: coordinateStringSchema,
  y: coordinateStringSchema,
})

const kakaoLocalRoadAddressDetailSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  address_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  region_1depth_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  region_2depth_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  region_3depth_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  road_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  underground_yn: kakaoLocalYesNoSchema,
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  main_building_no: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  sub_building_no: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  building_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  zone_no: z.string(),
  x: coordinateStringSchema,
  y: coordinateStringSchema,
})

const kakaoLocalAddressDocumentSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  address_name: z.string(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  address_type: kakaoLocalAddressTypeSchema,
  x: coordinateStringSchema,
  y: coordinateStringSchema,
  // 주소 또는 도로명주소가 없는 검색 결과가 있을 수 있음
  address: kakaoLocalAddressDetailSchema.nullable().optional(),
  // 주소 또는 도로명주소가 없는 검색 결과가 있을 수 있음
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  road_address: kakaoLocalRoadAddressDetailSchema.nullable().optional(),
})

const kakaoLocalAddressSearchMetaSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  total_count: z.number().int().nonnegative(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  pageable_count: z.number().int().nonnegative(),
  // biome-ignore lint/style/useNamingConvention: 카카오 API 응답 필드와 동일하게 유지
  is_end: z.boolean(),
})

export const kakaoLocalAddressSearchResponseSchema = z.object({
  meta: kakaoLocalAddressSearchMetaSchema,
  documents: z.array(kakaoLocalAddressDocumentSchema),
})

export type KakaoLocalAddressSearchResponse = z.infer<
  typeof kakaoLocalAddressSearchResponseSchema
>
