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

const KAKAO_LOCAL_ADDRESS_SEARCH_URL =
  'https://dapi.kakao.com/v2/local/search/address.json'
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
    const apiKey = this.config.get('KAKAO_REST_API_KEY', { infer: true }).trim()

    if (!apiKey) {
      throw new CommonException(CommonErrorCode.serviceUnavailable)
    }

    const url = new URL(KAKAO_LOCAL_ADDRESS_SEARCH_URL)
    url.search = new URLSearchParams({
      query: parsedRequest.data.query,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      analyze_type: parsedRequest.data.analyze_type,
      page: String(parsedRequest.data.page),
      size: String(parsedRequest.data.size),
    }).toString()

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

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new CommonException(CommonErrorCode.externalServiceError)
    }

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
}
