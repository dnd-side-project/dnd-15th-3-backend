import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
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
    const parsedRequest = kakaoLocalAddressSearchRequestSchema.parse(request)
    const apiKey = this.config.get('KAKAO_REST_API_KEY', { infer: true }).trim()

    if (!apiKey) {
      throw new ServiceUnavailableException(
        '카카오 REST API 키가 설정되지 않았습니다.',
      )
    }

    const url = new URL(KAKAO_LOCAL_ADDRESS_SEARCH_URL)
    url.search = new URLSearchParams({
      query: parsedRequest.query,
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      analyze_type: parsedRequest.analyze_type,
      page: String(parsedRequest.page),
      size: String(parsedRequest.size),
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
      throw new BadGatewayException(
        '카카오 주소 검색 API를 호출하지 못했습니다.',
      )
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `카카오 주소 검색 API가 ${response.status} 상태를 반환했습니다.`,
      )
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new BadGatewayException(
        '카카오 주소 검색 API 응답을 읽을 수 없습니다.',
      )
    }

    const parsedResponse = kakaoLocalAddressSearchResponseSchema.safeParse(body)
    if (!parsedResponse.success) {
      throw new BadGatewayException(
        '카카오 주소 검색 API 응답 형식이 올바르지 않습니다.',
      )
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
        name: document.address_name,
        address,
        latitude: Number(document.y),
        longitude: Number(document.x),
      }
    })
  }
}
