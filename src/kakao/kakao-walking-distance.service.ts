import { Injectable, Logger } from '@nestjs/common'
import { haversineDistanceMeters } from 'src/common/geo/haversine-distance'
import { KakaoWalkingCourseService } from './kakao-walking-course.service'

export type Coordinate = {
  latitude: number
  longitude: number
}

export type WalkingDistanceEstimate = {
  distanceMeters: number
  travelTimeSeconds: number
  /** 카카오 도보 경로를 못 구해 직선거리 기반으로 추정한 값이면 true */
  isEstimated: boolean
}

const STRAIGHT_LINE_TO_WALKING_RATIO = 1.2
const WALKING_SPEED_METERS_PER_SECOND = 1.2

/**
 * 두 지점 사이의 도보 거리·시간을 카카오 도보 경로 API로 조회한다.
 * API 호출 실패나 경로 미발견 시에도 예외를 던지지 않고 직선거리 기반
 * 추정치로 대체해서 항상 값을 반환한다 (AI 코스 생성이 카카오 장애 하나로
 * 전체 실패하지 않도록 하기 위함).
 */
@Injectable()
export class KakaoWalkingDistanceService {
  private readonly logger = new Logger(KakaoWalkingDistanceService.name)

  constructor(
    private readonly kakaoWalkingCourseService: KakaoWalkingCourseService,
  ) {}

  async getWalkingDistance(
    origin: Coordinate,
    destination: Coordinate,
  ): Promise<WalkingDistanceEstimate> {
    try {
      const response = await this.kakaoWalkingCourseService.getWalkingCourse({
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        start_x: String(origin.longitude),
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        start_y: String(origin.latitude),
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        end_x: String(destination.longitude),
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        end_y: String(destination.latitude),
      })
      if (response.status === 'OK' && response.route) {
        return {
          distanceMeters: response.route.properties.totalDistance,
          travelTimeSeconds: response.route.properties.totalTime,
          isEstimated: false,
        }
      }
    } catch (error) {
      this.logger.warn(
        '카카오 도보 경로를 사용할 수 없어 직선거리 기반 추정치를 사용합니다.',
        error instanceof Error ? error.message : String(error),
      )
    }

    const straightDistance = haversineDistanceMeters(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    )
    const estimatedDistance = Math.round(
      straightDistance * STRAIGHT_LINE_TO_WALKING_RATIO,
    )
    return {
      distanceMeters: estimatedDistance,
      travelTimeSeconds: Math.ceil(
        estimatedDistance / WALKING_SPEED_METERS_PER_SECOND,
      ),
      isEstimated: true,
    }
  }
}
