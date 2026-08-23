import { Injectable } from '@nestjs/common'
import { KakaoWalkingDistanceService } from 'src/kakao/kakao-walking-distance.service'
import type { CourseGenerationRuntimeInput } from './schema/course-generation-input.schema'

type Recommendation = CourseGenerationRuntimeInput['recommendations'][number]

export type CourseGenerationLeg = {
  travelTimeToNext: number | null
  distanceToNextMeters: number | null
}

@Injectable()
export class CourseGenerationRouteService {
  constructor(
    private readonly walkingDistanceService: KakaoWalkingDistanceService,
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
    const { distanceMeters, travelTimeSeconds } =
      await this.walkingDistanceService.getWalkingDistance(origin, destination)
    return {
      distanceToNextMeters: distanceMeters,
      travelTimeToNext: travelTimeSeconds,
    }
  }
}
