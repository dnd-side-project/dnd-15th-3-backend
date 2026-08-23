import { Injectable, Logger } from '@nestjs/common'
import type { CategorySlug } from 'src/category/enums/category-slug.enum'
import { KakaoWalkingCourseService } from 'src/kakao/kakao-walking-course.service'
import type { KakaoWalkingCourseResponse } from 'src/kakao/schema/walking-course-response.schema'
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
  private readonly logger = new Logger(CourseGeneratorInputBuilder.name)

  constructor(
    private readonly kakaoWalkingCourseService: KakaoWalkingCourseService,
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

  private async getWalkingDistanceMeters(
    origin: Coordinate | undefined,
    destination: Coordinate | undefined,
  ): Promise<number | null> {
    if (!origin || !destination) return null

    let walkingCourse: KakaoWalkingCourseResponse
    try {
      walkingCourse = await this.kakaoWalkingCourseService.getWalkingCourse({
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        start_x: String(origin.longitude),
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        start_y: String(origin.latitude),
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        end_x: String(destination.longitude),
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        end_y: String(destination.latitude),
      })
    } catch (error) {
      // API 키 미설정, 네트워크 오류 등 서비스 자체의 문제. 이 쌍만 없는 걸로
      // 조용히 넘기면 원인 파악이 안 되므로 로그를 남기고 그대로 전파한다.
      this.logger.error(
        `카카오 도보 경로 API 호출에 실패했습니다. origin=(${origin.longitude}, ${origin.latitude}) destination=(${destination.longitude}, ${destination.latitude})`,
        error instanceof Error ? error.stack : error,
      )
      throw error
    }

    // 경로 자체를 찾을 수 없는 건 정상적인 응답이다 (두 지점 사이에 도보 경로가 없을 수 있음).
    if (walkingCourse.status !== 'OK' || !walkingCourse.route) return null
    return walkingCourse.route.properties.totalDistance
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
