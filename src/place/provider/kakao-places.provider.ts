import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { Env } from 'src/config/env'
import {
  type KakaoPlaceDocument,
  type KakaoPlaceSearchResponse,
  kakaoPlaceSearchResponseSchema,
} from 'src/kakao/schema/local-place-search-response.schema'
import { PlaceSource } from '../enums/place-source.enum'
import { PlaceException } from '../exception/place.exception'
import { PlaceErrorCode } from '../exception/place-error-code'
import {
  KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY,
  type KakaoPlaceSearchSpec,
} from './kakao-place-category-mapping'
import type {
  PlaceProvider,
  PlaceProviderPlace,
  PlaceProviderSearchRequest,
  PlaceProviderSearchResult,
} from './place-provider'

const KAKAO_CATEGORY_SEARCH_URL =
  'https://dapi.kakao.com/v2/local/search/category.json'
const KAKAO_KEYWORD_SEARCH_URL =
  'https://dapi.kakao.com/v2/local/search/keyword.json'
const KAKAO_REQUEST_TIMEOUT_MS = 5_000
const KAKAO_PAGE_SIZE = 15
const KAKAO_MAX_PAGE = 45

type KakaoSearchResult = {
  documents: KakaoPlaceDocument[]
  isComplete: boolean
}

@Injectable()
export class KakaoPlacesProvider implements PlaceProvider {
  readonly source = PlaceSource.Kakao

  constructor(private readonly config: ConfigService<Env, true>) {}

  supportsCategory(categorySlug: CategorySlug): boolean {
    return KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY[categorySlug].length > 0
  }

  async searchNearby(
    request: PlaceProviderSearchRequest,
  ): Promise<PlaceProviderSearchResult> {
    const specs = KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY[request.categorySlug]
    if (specs.length === 0) return { places: [], isComplete: true }

    const apiKey = this.config.get('KAKAO_REST_API_KEY', { infer: true }).trim()
    if (!apiKey) {
      throw new PlaceException(PlaceErrorCode.providerUnavailable)
    }

    const placesById = new Map<string, PlaceProviderPlace>()
    let isComplete = true

    for (const spec of specs) {
      const result = await this.searchAllPages(spec, request, apiKey)
      isComplete = isComplete && result.isComplete

      for (const document of result.documents) {
        const place = this.toProviderPlace(document)
        if (!placesById.has(place.providerPlaceId)) {
          placesById.set(place.providerPlaceId, place)
        }
      }
    }

    return { places: [...placesById.values()], isComplete }
  }

  private async searchAllPages(
    spec: KakaoPlaceSearchSpec,
    request: PlaceProviderSearchRequest,
    apiKey: string,
  ): Promise<KakaoSearchResult> {
    const documents: KakaoPlaceDocument[] = []
    let isComplete = true

    for (let page = 1; page <= KAKAO_MAX_PAGE; page += 1) {
      const response = await this.searchPage(spec, request, apiKey, page)
      documents.push(...response.documents)
      if (response.meta.total_count > response.meta.pageable_count) {
        isComplete = false
      }
      if (response.meta.is_end) return { documents, isComplete }
    }

    return { documents, isComplete: false }
  }

  private async searchPage(
    spec: KakaoPlaceSearchSpec,
    request: PlaceProviderSearchRequest,
    apiKey: string,
    page: number,
  ): Promise<KakaoPlaceSearchResponse> {
    const userQuery = request.query?.trim()
    const keywordQuery =
      spec.type === 'keyword'
        ? userQuery
          ? this.combineQueries(userQuery, spec.query)
          : spec.query
        : userQuery
    const url = new URL(
      keywordQuery ? KAKAO_KEYWORD_SEARCH_URL : KAKAO_CATEGORY_SEARCH_URL,
    )
    const searchParams = new URLSearchParams({
      x: String(request.longitude),
      y: String(request.latitude),
      radius: String(request.radiusMeters),
      sort: 'distance',
      page: String(page),
      size: String(KAKAO_PAGE_SIZE),
    })
    if (keywordQuery) {
      searchParams.set('query', keywordQuery)
    }
    if (spec.type === 'category') {
      searchParams.set('category_group_code', spec.categoryGroupCode)
    }
    url.search = searchParams.toString()

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          // biome-ignore lint/style/useNamingConvention: 카카오 API 인증 헤더 이름과 동일하게 유지
          Authorization: `KakaoAK ${apiKey}`,
        },
        signal: AbortSignal.timeout(KAKAO_REQUEST_TIMEOUT_MS),
      })
    } catch {
      throw new PlaceException(PlaceErrorCode.providerRequestFailed)
    }

    if (!response.ok) {
      throw new PlaceException(PlaceErrorCode.providerRequestFailed)
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new PlaceException(PlaceErrorCode.invalidProviderResponse)
    }

    const parsedResponse = kakaoPlaceSearchResponseSchema.safeParse(body)
    if (!parsedResponse.success) {
      throw new PlaceException(PlaceErrorCode.invalidProviderResponse)
    }
    return parsedResponse.data
  }

  private combineQueries(userQuery: string, categoryQuery: string): string {
    if (userQuery.includes(categoryQuery)) return userQuery
    return `${userQuery} ${categoryQuery}`
  }

  private toProviderPlace(document: KakaoPlaceDocument): PlaceProviderPlace {
    const latitude = Number(document.y)
    const longitude = Number(document.x)
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new PlaceException(PlaceErrorCode.invalidProviderResponse)
    }

    const roadAddress = document.road_address_name.trim() || null
    const address =
      document.address_name.trim() || roadAddress || document.place_name

    return {
      providerPlaceId: document.id,
      name: document.place_name,
      address,
      roadAddress,
      latitude,
      longitude,
      phone: document.phone.trim() || null,
      placeUrl: document.place_url.trim() || null,
      providerCategoryCode:
        document.category_group_code.trim() ||
        document.category_name.trim() ||
        null,
    }
  }
}
