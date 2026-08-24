import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MetricsService } from 'src/common/observability/metrics.service'
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
// targetTotal이 있을 때 한 번에 동시 실행할 페이지 요청 수.
// 카카오 API 초당 요청 제한(50회)을 넘기지 않기 위한 안전값이다.
const KAKAO_BATCH_SIZE = 5
const KAKAO_MAX_RETRY_ATTEMPTS = 3
const KAKAO_RETRY_BASE_DELAY_MS = 300

type KakaoSearchResult = {
  documents: KakaoPlaceDocument[]
  isComplete: boolean
}

type KakaoPageTask = {
  spec: KakaoPlaceSearchSpec
  page: number
}

@Injectable()
export class KakaoPlacesProvider implements PlaceProvider {
  readonly source = PlaceSource.Kakao

  constructor(
    private readonly config: ConfigService<Env, true>,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  supportsCategory(categorySlug: CategorySlug): boolean {
    return KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY[categorySlug].length > 0
  }

  searchNearby(
    request: PlaceProviderSearchRequest,
  ): Promise<PlaceProviderSearchResult> {
    if (!this.metrics) return this.requestNearby(request)

    return this.metrics.observeExternal('kakao_places', 'nearby_search', () =>
      this.requestNearby(request),
    )
  }

  private async requestNearby(
    request: PlaceProviderSearchRequest,
  ): Promise<PlaceProviderSearchResult> {
    const specs = KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY[request.categorySlug]
    if (specs.length === 0) return { places: [], isComplete: true }

    const apiKey = this.config.get('KAKAO_REST_API_KEY', { infer: true }).trim()
    if (!apiKey) {
      throw new PlaceException(PlaceErrorCode.providerUnavailable)
    }

    const specResults =
      request.targetTotal === undefined
        ? await this.searchSpecsSequentially(specs, request, apiKey)
        : await this.searchSpecsBounded(
            specs,
            request,
            apiKey,
            request.targetTotal,
          )

    const placesById = new Map<string, PlaceProviderPlace>()
    let isComplete = true

    for (const result of specResults) {
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

  // 기존 동작: 스펙마다 순차로, is_end가 나올 때까지(최대 KAKAO_MAX_PAGE) 조회한다.
  // targetTotal을 안 넘기는 호출(예: 일반 장소 검색)은 전부 이 경로를 그대로 탄다.
  private async searchSpecsSequentially(
    specs: readonly KakaoPlaceSearchSpec[],
    request: PlaceProviderSearchRequest,
    apiKey: string,
  ): Promise<KakaoSearchResult[]> {
    const results: KakaoSearchResult[] = []
    for (const spec of specs) {
      results.push(await this.searchAllPages(spec, request, apiKey))
    }
    return results
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

  // targetTotal이 있는 호출(비슷한 장소 추천) 전용 경로.
  // 스펙 수로 필요한 페이지 수를 나눠 계산한 뒤, 스펙/페이지 구분 없이
  // 하나의 요청 목록으로 모아 KAKAO_BATCH_SIZE개씩 배치로 병렬 조회한다.
  // 배치 도중 어떤 스펙이 is_end에 도달하면, 그 스펙의 남은 페이지 요청은
  // 이후 배치에서 건너뛴다.
  private async searchSpecsBounded(
    specs: readonly KakaoPlaceSearchSpec[],
    request: PlaceProviderSearchRequest,
    apiKey: string,
    targetTotal: number,
  ): Promise<KakaoSearchResult[]> {
    const pagesPerSpec = Math.min(
      KAKAO_MAX_PAGE,
      Math.max(1, Math.ceil(targetTotal / (KAKAO_PAGE_SIZE * specs.length))),
    )

    const tasks: KakaoPageTask[] = []
    for (const spec of specs) {
      for (let page = 1; page <= pagesPerSpec; page += 1) {
        tasks.push({ spec, page })
      }
    }

    const documentsBySpec = new Map<KakaoPlaceSearchSpec, KakaoPlaceDocument[]>(
      specs.map((spec) => [spec, []]),
    )
    const isCompleteBySpec = new Map<KakaoPlaceSearchSpec, boolean>(
      specs.map((spec) => [spec, true]),
    )
    const endedSpecs = new Set<KakaoPlaceSearchSpec>()

    for (let i = 0; i < tasks.length; i += KAKAO_BATCH_SIZE) {
      const batch = tasks
        .slice(i, i + KAKAO_BATCH_SIZE)
        .filter((task) => !endedSpecs.has(task.spec))
      if (batch.length === 0) continue

      const responses = await Promise.all(
        batch.map((task) =>
          this.searchPage(task.spec, request, apiKey, task.page),
        ),
      )

      batch.forEach((task, index) => {
        const response = responses[index]
        documentsBySpec.get(task.spec)?.push(...response.documents)
        if (response.meta.total_count > response.meta.pageable_count) {
          isCompleteBySpec.set(task.spec, false)
        }
        if (response.meta.is_end) {
          endedSpecs.add(task.spec)
        }
      })
    }

    return specs.map((spec) => ({
      documents: documentsBySpec.get(spec) ?? [],
      isComplete: isCompleteBySpec.get(spec) ?? true,
    }))
  }

  private async searchPage(
    spec: KakaoPlaceSearchSpec,
    request: PlaceProviderSearchRequest,
    apiKey: string,
    page: number,
    attempt = 1,
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

    if (response.status === 429 && attempt < KAKAO_MAX_RETRY_ATTEMPTS) {
      await this.delay(KAKAO_RETRY_BASE_DELAY_MS * attempt)
      return this.searchPage(spec, request, apiKey, page, attempt + 1)
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
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
