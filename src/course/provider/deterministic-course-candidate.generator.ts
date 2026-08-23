import { Injectable } from '@nestjs/common'
import { haversineDistanceMeters } from 'src/common/geo/haversine-distance'
import { QuestionnaireOptionCode } from 'src/questionnaire/questionnaire.constants'
import type { CourseGenerationRuntimeInput } from '../schema/course-generation-input.schema'
import {
  type CourseGenerationOutputSnapshot,
  courseGenerationOutputSchema,
} from '../schema/course-generation-output.schema'
import type { CourseCandidateGenerator } from './course-candidate.generator'

type Recommendation = CourseGenerationRuntimeInput['recommendations'][number]

@Injectable()
export class DeterministicCourseCandidateGenerator
  implements CourseCandidateGenerator
{
  generate(
    input: CourseGenerationRuntimeInput,
  ): Promise<CourseGenerationOutputSnapshot> {
    const selectedOptions = new Set(
      input.questionnaire?.answers.map((answer) => answer.optionCode) ?? [],
    )
    const prefersDiscovery = selectedOptions.has(
      QuestionnaireOptionCode.newExperience,
    )
    const preferenceRoute = this.buildRoute(
      input,
      prefersDiscovery ? 'DISCOVERY' : 'PREFERENCE',
    )
    const distanceRoute = this.buildRoute(input, 'DISTANCE')
    const alternativeRoute = this.buildRoute(
      input,
      prefersDiscovery ? 'PREFERENCE' : 'DISCOVERY',
    )
    const candidates = [
      {
        name: this.preferenceCourseName(selectedOptions),
        recommendationIds: preferenceRoute.map(
          (recommendation) => recommendation.recommendationId,
        ),
      },
      {
        name: selectedOptions.has(QuestionnaireOptionCode.efficient)
          ? '빠른 동선 코스'
          : '가까운 동선 코스',
        recommendationIds: distanceRoute.map(
          (recommendation) => recommendation.recommendationId,
        ),
      },
      {
        name: prefersDiscovery ? '모두의 취향 코스' : '새로운 발견 코스',
        recommendationIds: alternativeRoute.map(
          (recommendation) => recommendation.recommendationId,
        ),
      },
    ].filter(
      (candidate, index, all) =>
        all.findIndex(
          (other) =>
            other.recommendationIds.join(',') ===
            candidate.recommendationIds.join(','),
        ) === index,
    )

    return Promise.resolve(
      courseGenerationOutputSchema.parse({
        schemaVersion: 1,
        provider: 'internal',
        model: 'deterministic-v1',
        candidates,
      }),
    )
  }

  private buildRoute(
    input: CourseGenerationRuntimeInput,
    strategy: 'PREFERENCE' | 'DISCOVERY' | 'DISTANCE',
  ): Recommendation[] {
    const used = new Set<string>()
    const route: Recommendation[] = []

    for (const step of input.categorySteps) {
      const candidates = input.recommendations.filter(
        (recommendation) =>
          recommendation.categorySlug === step.categorySlug &&
          !used.has(recommendation.recommendationId),
      )
      if (candidates.length === 0) {
        throw new Error(
          `No recommendation available for course step ${step.order}`,
        )
      }

      const origin = route.at(-1) ?? input.meeting.location
      candidates.sort((left, right) => {
        if (strategy === 'DISTANCE') {
          return (
            this.distanceFrom(origin, left) -
              this.distanceFrom(origin, right) ||
            this.preferenceScore(right) - this.preferenceScore(left) ||
            left.recommendationId.localeCompare(right.recommendationId)
          )
        }
        const scoreDelta =
          strategy === 'DISCOVERY'
            ? this.discoveryScore(right) - this.discoveryScore(left)
            : this.preferenceScore(right) - this.preferenceScore(left)
        return (
          scoreDelta ||
          this.distanceFrom(origin, left) - this.distanceFrom(origin, right) ||
          left.recommendationId.localeCompare(right.recommendationId)
        )
      })

      const selected = candidates[0]
      used.add(selected.recommendationId)
      route.push(selected)
    }
    return route
  }

  private preferenceScore(recommendation: Recommendation): number {
    return recommendation.likeCount * 3 - recommendation.dislikeCount * 2
  }

  private discoveryScore(recommendation: Recommendation): number {
    return -(recommendation.likeCount + recommendation.dislikeCount)
  }

  private distanceFrom(
    origin: { latitude: number; longitude: number },
    destination: Recommendation,
  ): number {
    return haversineDistanceMeters(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    )
  }

  private preferenceCourseName(selectedOptions: Set<string>): string {
    if (selectedOptions.has(QuestionnaireOptionCode.cozy)) {
      return '아늑한 취향 코스'
    }
    if (selectedOptions.has(QuestionnaireOptionCode.lively)) {
      return '활기찬 취향 코스'
    }
    if (selectedOptions.has(QuestionnaireOptionCode.scenic)) {
      return '풍경 중심 코스'
    }
    return '모두의 취향 코스'
  }
}
