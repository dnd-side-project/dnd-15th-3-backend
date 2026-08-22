import { Injectable, Logger } from '@nestjs/common'
import { haversineDistanceMeters } from 'src/common/geo/haversine-distance'
import { KakaoWalkingCourseService } from 'src/kakao/kakao-walking-course.service'
import type { CourseGenerationInputSnapshot } from './schema/course-generation-input.schema'

type Recommendation = CourseGenerationInputSnapshot['recommendations'][number]

export type CourseGenerationLeg = {
  travelTimeToNext: number | null
  distanceToNextMeters: number | null
}

@Injectable()
export class CourseGenerationRouteService {
  private readonly logger = new Logger(CourseGenerationRouteService.name)

  constructor(
    private readonly kakaoWalkingCourseService: KakaoWalkingCourseService,
  ) {}

  async getLegs(route: Recommendation[]): Promise<CourseGenerationLeg[]> {
    const legs = await Promise.all(
      route
        .slice(0, -1)
        .map((origin, index) => this.getLeg(origin, route[index + 1])),
    )
    return [...legs, { travelTimeToNext: null, distanceToNextMeters: null }]
  }

  private async getLeg(
    origin: Recommendation,
    destination: Recommendation,
  ): Promise<CourseGenerationLeg> {
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
          travelTimeToNext: response.route.properties.totalTime,
          distanceToNextMeters: response.route.properties.totalDistance,
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
    const estimatedWalkingDistance = Math.round(straightDistance * 1.2)
    return {
      distanceToNextMeters: estimatedWalkingDistance,
      travelTimeToNext: Math.ceil(estimatedWalkingDistance / 1.2),
    }
  }
}
