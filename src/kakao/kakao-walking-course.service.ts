import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import {
  type KakaoWalkingCourseRequest,
  kakaoWalkingCourseRequestSchema,
} from './schema/walking-course-request.schema'
import {
  type KakaoWalkingCourseResponse,
  kakaoWalkingCourseResponseSchema,
} from './schema/walking-course-response.schema'

const KAKAO_WALKING_COURSE_URL = 'https://dapi.kakao.com/v2/routing/walk'
const KAKAO_REQUEST_TIMEOUT_MS = 5_000

@Injectable()
export class KakaoWalkingCourseService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async getWalkingCourse(
    request: KakaoWalkingCourseRequest,
  ): Promise<KakaoWalkingCourseResponse> {
    const parsedRequest = kakaoWalkingCourseRequestSchema.parse(request)
    const apiKey = this.config.get('KAKAO_REST_API_KEY', { infer: true }).trim()

    if (!apiKey) {
      throw new ServiceUnavailableException(
        '카카오 REST API 키가 설정되지 않았습니다.',
      )
    }

    const url = new URL(KAKAO_WALKING_COURSE_URL)
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(parsedRequest)) {
      if (value !== undefined) {
        params.set(key, value)
      }
    }
    url.search = params.toString()

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
        '카카오 도보 경로 API를 호출하지 못했습니다.',
      )
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `카카오 도보 경로 API가 ${response.status} 상태를 반환했습니다.`,
      )
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new BadGatewayException(
        '카카오 도보 경로 API 응답을 읽을 수 없습니다.',
      )
    }

    const parsedResponse = kakaoWalkingCourseResponseSchema.safeParse(body)
    if (!parsedResponse.success) {
      throw new BadGatewayException(
        '카카오 도보 경로 API 응답 형식이 올바르지 않습니다.',
      )
    }

    return parsedResponse.data
  }
}
