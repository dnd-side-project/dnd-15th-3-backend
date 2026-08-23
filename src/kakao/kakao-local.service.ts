import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { createValidationException } from 'src/common/exception/validation-exception.factory'
import type { Env } from 'src/config/env'
import type { PlaceSearchResult } from 'src/place/place.types'
import {
  type KakaoLocalAddressSearchRequest,
  kakaoLocalAddressSearchRequestSchema,
} from './schema/local-address-search-request.schema'
import {
  type KakaoLocalAddressSearchResponse,
  kakaoLocalAddressSearchResponseSchema,
} from './schema/local-address-search-response.schema'
import {
  type KakaoLocalKeywordSearchRequest,
  kakaoLocalKeywordSearchRequestSchema,
} from './schema/local-keyword-search-request.schema'
import { kakaoPlaceSearchResponseSchema } from './schema/local-place-search-response.schema'

const KAKAO_LOCAL_ADDRESS_SEARCH_URL =
  'https://dapi.kakao.com/v2/local/search/address.json'
const KAKAO_LOCAL_KEYWORD_SEARCH_URL =
  'https://dapi.kakao.com/v2/local/search/keyword.json'
const KAKAO_REQUEST_TIMEOUT_MS = 5_000

@Injectable()
export class KakaoLocalService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async searchAddress(
    request: KakaoLocalAddressSearchRequest,
  ): Promise<KakaoLocalAddressSearchResponse> {
    const parsedRequest =
      kakaoLocalAddressSearchRequestSchema.safeParse(request)
    if (!parsedRequest.success) {
      throw createValidationException(parsedRequest.error.issues)
    }
    const url = new URL(KAKAO_LOCAL_ADDRESS_SEARCH_URL)
    url.search = new URLSearchParams({
      query: parsedRequest.data.query,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      analyze_type: parsedRequest.data.analyze_type,
      page: String(parsedRequest.data.page),
      size: String(parsedRequest.data.size),
    }).toString()

    const body = await this.request(url)

    const parsedResponse = kakaoLocalAddressSearchResponseSchema.safeParse(body)
    if (!parsedResponse.success) {
      throw new CommonException(CommonErrorCode.externalServiceError)
    }

    return parsedResponse.data
  }

  async searchAddressPlaces(
    request: KakaoLocalAddressSearchRequest,
  ): Promise<PlaceSearchResult[]> {
    const response = await this.searchAddress(request)

    return response.documents.map((document) => {
      const address =
        document.road_address?.address_name ??
        document.address?.address_name ??
        document.address_name

      return {
        id: `kakao-address-${document.x}-${document.y}`,
        externalAddressId: `kakao-address-${document.x}-${document.y}`,
        name: document.address_name,
        address,
        latitude: Number(document.y),
        longitude: Number(document.x),
      }
    })
  }

  async searchKeywordPlaces(
    request: KakaoLocalKeywordSearchRequest,
  ): Promise<PlaceSearchResult[]> {
    const parsedRequest =
      kakaoLocalKeywordSearchRequestSchema.safeParse(request)
    if (!parsedRequest.success) {
      throw createValidationException(parsedRequest.error.issues)
    }

    const url = new URL(KAKAO_LOCAL_KEYWORD_SEARCH_URL)
    url.search = new URLSearchParams({
      query: parsedRequest.data.query,
      page: String(parsedRequest.data.page),
      size: String(parsedRequest.data.size),
    }).toString()

    const body = await this.request(url)
    const parsedResponse = kakaoPlaceSearchResponseSchema.safeParse(body)
    if (!parsedResponse.success) {
      throw new CommonException(CommonErrorCode.externalServiceError)
    }

    return parsedResponse.data.documents.map((document) => {
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
        throw new CommonException(CommonErrorCode.externalServiceError)
      }

      const externalAddressId = `kakao-place-${document.id}`
      const address =
        document.road_address_name.trim() ||
        document.address_name.trim() ||
        document.place_name

      return {
        id: externalAddressId,
        externalAddressId,
        name: document.place_name,
        address,
        latitude,
        longitude,
      }
    })
  }

  private async request(url: URL): Promise<unknown> {
    const apiKey = this.config.get('KAKAO_REST_API_KEY', { infer: true }).trim()
    if (!apiKey) {
      throw new CommonException(CommonErrorCode.serviceUnavailable)
    }

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
          Authorization: `KakaoAK ${apiKey}`,
        },
        signal: AbortSignal.timeout(KAKAO_REQUEST_TIMEOUT_MS),
      })
    } catch {
      throw new CommonException(CommonErrorCode.externalServiceError)
    }

    if (!response.ok) {
      throw new CommonException(CommonErrorCode.externalServiceError)
    }

    try {
      return await response.json()
    } catch {
      throw new CommonException(CommonErrorCode.externalServiceError)
    }
  }
}
