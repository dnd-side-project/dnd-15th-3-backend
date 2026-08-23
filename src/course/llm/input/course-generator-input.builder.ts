import { Injectable } from '@nestjs/common'
import type { CategorySlug } from 'src/category/enums/category-slug.enum'
import { KakaoWalkingDistanceService } from 'src/kakao/kakao-walking-distance.service'
import { PlaceTagRepository } from 'src/statistics/place-tag.repository'
import { calculatePreferenceScore } from '../../course-preference-score'
import type { CourseGenerationRuntimeInput } from '../../schema/course-generation-input.schema'
import {
  type CourseGeneratorInput,
  parseCourseGeneratorInput,
} from '../course-generator-input.schema'
import {
  buildDistanceMatrixValues,
  type DistanceMatrixPlace,
  START_NODE_ID,
} from './course-generator-input.distance-matrix'

type Coordinate = { longitude: number; latitude: number }
type CourseGeneratorPlace = CourseGeneratorInput['places'][number]
type Recommendation = CourseGenerationRuntimeInput['recommendations'][number]

const SATURDAY = 6
const SUNDAY = 0

@Injectable()
export class CourseGeneratorInputBuilder {
  constructor(
    private readonly walkingDistanceService: KakaoWalkingDistanceService,
    private readonly placeTagRepository: PlaceTagRepository,
  ) {}

  async build(
    input: CourseGenerationRuntimeInput,
  ): Promise<CourseGeneratorInput> {
    const visitOrder = this.buildVisitOrder(input)
    const [places, distanceMatrixValues] = await Promise.all([
      this.buildPlaces(input.recommendations),
      this.buildDistanceMatrix(input, visitOrder),
    ])

    return parseCourseGeneratorInput({
      startNodeId: START_NODE_ID,
      meetingType: input.meeting.meetingTypeCode,
      isWeekend: this.isWeekendDate(input.meeting.date),
      qna: this.buildQna(input.questionnaire),
      visitOrder,
      places,
      distanceMatrix: {
        unit: 'meter',
        metric: 'walking_network_distance',
        directed: true,
        values: distanceMatrixValues,
      },
    })
  }

  private buildVisitOrder(input: CourseGenerationRuntimeInput): CategorySlug[] {
    return input.categorySteps
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((step) => step.categorySlug)
  }

  private buildQna(
    questionnaire: CourseGenerationRuntimeInput['questionnaire'],
  ): CourseGeneratorInput['qna'] {
    if (!questionnaire) return []
    return questionnaire.answers.map((answer) => ({
      question: answer.questionText,
      answer: answer.optionLabel,
    }))
  }

  private async buildPlaces(
    recommendations: readonly Recommendation[],
  ): Promise<CourseGeneratorPlace[]> {
    const tagCodesByPlaceId =
      await this.placeTagRepository.findTagCodesByPlaceIds(
        recommendations.map((recommendation) => recommendation.placeId),
      )

    return recommendations.map((recommendation) => ({
      id: recommendation.recommendationId,
      name: recommendation.name,
      category: recommendation.categorySlug,
      score: calculatePreferenceScore(
        recommendation.likeCount,
        recommendation.dislikeCount,
      ),
      tags: tagCodesByPlaceId.get(recommendation.placeId) ?? [],
    }))
  }

  private buildDistanceMatrix(
    input: CourseGenerationRuntimeInput,
    visitOrder: readonly CategorySlug[],
  ): Promise<Record<string, Record<string, number>>> {
    const placesByCategory = new Map<CategorySlug, DistanceMatrixPlace[]>()
    const coordinateById = new Map<string, Coordinate>()

    for (const recommendation of input.recommendations) {
      const group = placesByCategory.get(recommendation.categorySlug) ?? []
      group.push({ id: recommendation.recommendationId })
      placesByCategory.set(recommendation.categorySlug, group)
      coordinateById.set(recommendation.recommendationId, {
        longitude: recommendation.longitude,
        latitude: recommendation.latitude,
      })
    }
    coordinateById.set(START_NODE_ID, {
      longitude: input.meeting.location.longitude,
      latitude: input.meeting.location.latitude,
    })

    const positionPools = visitOrder.map(
      (category) => placesByCategory.get(category) ?? [],
    )

    return buildDistanceMatrixValues(positionPools, (fromId, toId) =>
      this.getWalkingDistanceMeters(
        coordinateById.get(fromId),
        coordinateById.get(toId),
      ),
    )
  }

  private async getWalkingDistanceMeters(
    origin: Coordinate | undefined,
    destination: Coordinate | undefined,
  ): Promise<number | null> {
    if (!origin || !destination) return null

    const { distanceMeters } =
      await this.walkingDistanceService.getWalkingDistance(origin, destination)
    return distanceMeters
  }

  private isWeekendDate(date: string): boolean {
    const [year, month, day] = date.split('-').map(Number)
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    return dayOfWeek === SATURDAY || dayOfWeek === SUNDAY
  }
}
