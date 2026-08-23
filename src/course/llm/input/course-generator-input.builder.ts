import { Injectable } from '@nestjs/common'
import type { CategorySlug } from 'src/category/enums/category-slug.enum'
import { KakaoWalkingDistanceService } from 'src/kakao/kakao-walking-distance.service'
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

const DISLIKE_WEIGHT = 1.5
const SATURDAY = 6
const SUNDAY = 0

@Injectable()
export class CourseGeneratorInputBuilder {
  constructor(
    private readonly walkingDistanceService: KakaoWalkingDistanceService,
  ) {}

  async build(
    input: CourseGenerationRuntimeInput,
  ): Promise<CourseGeneratorInput> {
    const visitOrder = this.buildVisitOrder(input)
    const places = this.buildPlaces(input.recommendations)
    const distanceMatrixValues = await this.buildDistanceMatrix(
      input,
      visitOrder,
    )

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

  private buildPlaces(
    recommendations: readonly Recommendation[],
  ): CourseGeneratorPlace[] {
    return recommendations.map((recommendation) => ({
      id: recommendation.recommendationId,
      name: recommendation.name,
      category: recommendation.categorySlug,
      score: this.calculatePreferenceScore(
        recommendation.likeCount,
        recommendation.dislikeCount,
      ),
      tags: [], // TODO: 통계 DB의 PlaceTag가 연결되면 실제 태그로 교체
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

  /**
   * 카카오 도보 경로를 못 구해도(API 오류·경로 미발견) 던지지 않고
   * CourseGenerationRouteService와 동일하게 직선거리 기반 추정치로 대체한다.
   * 카카오 장애 하나 때문에 AI 코스 생성 전체가 수동 생성으로 폴백되지
   * 않게 하기 위함이다.
   */
  private async getWalkingDistanceMeters(
    origin: Coordinate | undefined,
    destination: Coordinate | undefined,
  ): Promise<number | null> {
    if (!origin || !destination) return null

    const { distanceMeters } =
      await this.walkingDistanceService.getWalkingDistance(origin, destination)
    return distanceMeters
  }

  private calculatePreferenceScore(
    likeCount: number,
    dislikeCount: number,
  ): number {
    return likeCount - dislikeCount * DISLIKE_WEIGHT
  }

  /**
   * `date`는 "YYYY-MM-DD" 형식의 순수 달력 날짜 문자열이다. 시간대 영향 없이
   * 요일만 판단하기 위해 UTC 기준으로 계산한다.
   */
  private isWeekendDate(date: string): boolean {
    const [year, month, day] = date.split('-').map(Number)
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    return dayOfWeek === SATURDAY || dayOfWeek === SUNDAY
  }
}
