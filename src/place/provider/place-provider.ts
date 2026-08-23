import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PlaceSource } from '../enums/place-source.enum'

export type PlaceProviderSearchRequest = {
  latitude: number
  longitude: number
  radiusMeters: number
  categorySlug: CategorySlug
  query?: string
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
