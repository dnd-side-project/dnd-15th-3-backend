import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PlaceSource } from '../enums/place-source.enum'

export type PlaceProviderSearchRequest = {
  latitude: number
  longitude: number
  radiusMeters: number
  categorySlug: CategorySlug
  query?: string
  /**
   * 설정하면 스펙(카테고리 그룹/키워드)별 상한 페이지 수를
   * `ceil(targetTotal / (페이지당 개수 × 스펙 수))`로 동적으로 계산해
   * 필요한 만큼만 병렬·배치로 가져온다. 지정하지 않으면 기존처럼
   * 스펙마다 끝까지(is_end 또는 최대 페이지까지) 순차 조회한다.
   */
  targetTotal?: number
}

export type PlaceProviderPlace = {
  providerPlaceId: string
  name: string
  address: string
  roadAddress: string | null
  latitude: number
  longitude: number
  phone: string | null
  placeUrl: string | null
  providerCategoryCode: string | null
}

export type PlaceProviderSearchResult = {
  places: PlaceProviderPlace[]
  isComplete: boolean
}

export interface PlaceProvider {
  readonly source: PlaceSource

  supportsCategory(categorySlug: CategorySlug): boolean

  searchNearby(
    request: PlaceProviderSearchRequest,
  ): Promise<PlaceProviderSearchResult>
}
