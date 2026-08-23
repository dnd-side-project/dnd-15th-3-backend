import { Injectable, Logger } from '@nestjs/common'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { KakaoWalkingCourseService } from 'src/kakao/kakao-walking-course.service'
import type { KakaoWalkingCourseResponse } from 'src/kakao/schema/walking-course-response.schema'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import type { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { MeetingException } from 'src/meeting/exception/meeting.exception'
import { MeetingErrorCode } from 'src/meeting/exception/meeting-error-code'
import { DataSource } from 'typeorm'
import { CourseCategoryStep } from '../../entities/course-category-step.entity'
import type { MeetingPlaceRecommendation } from '../../entities/meeting-place-recommendation.entity'
import { MeetingPlaceRecommendationRepository } from '../../meeting-place-recommendation.repository'
import { MeetingPlaceRecommendationVoteRepository } from '../../meeting-place-recommendation-vote.repository'
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

const DISLIKE_WEIGHT = 1.5
const SATURDAY = 6
const SUNDAY = 0

@Injectable()
export class CourseGeneratorInputBuilder {
  private readonly logger = new Logger(CourseGeneratorInputBuilder.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly recommendationRepository: MeetingPlaceRecommendationRepository,
    private readonly voteRepository: MeetingPlaceRecommendationVoteRepository,
    private readonly kakaoWalkingCourseService: KakaoWalkingCourseService,
  ) {}

  async build(meetingId: string): Promise<CourseGeneratorInput> {
    const meeting = await this.findMeetingOrThrow(meetingId)
    meeting.assertHasLocation()

    const [visitOrder, recommendations] = await Promise.all([
      this.findVisitOrder(meetingId),
      this.recommendationRepository.findByMeeting(meetingId),
    ])

    const places = await this.buildPlaces(recommendations)
    const distanceMatrixValues = await this.buildMeetingDistanceMatrix(
      meeting,
      visitOrder,
      recommendations,
    )

    return parseCourseGeneratorInput({
      startNodeId: START_NODE_ID,
      meetingType: meeting.meetingType.code as MeetingTypeCode,
      isWeekend: this.isWeekendDate(meeting.date),
      qna: [], // TODO: qna 엔티티가 생기면 실제 질문-답변 데이터로 교체
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

  private async findMeetingOrThrow(meetingId: string): Promise<Meeting> {
    const meeting = await this.dataSource.getRepository(Meeting).findOne({
      where: { id: meetingId },
      relations: { meetingType: true, meetingLocation: true },
    })
    if (!meeting) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }
    return meeting
  }

  private async findVisitOrder(meetingId: string): Promise<CategorySlug[]> {
    const steps = await this.dataSource.getRepository(CourseCategoryStep).find({
      where: { meeting: { id: meetingId } },
      relations: { category: true },
      order: { order: 'ASC' },
    })
    if (steps.length === 0) {
      throw new MeetingException(
        MeetingErrorCode.courseCategoryStepsDataMissing,
      )
    }
    return steps.map((step) => step.category.slug as CategorySlug)
  }

  private async buildPlaces(
    recommendations: readonly MeetingPlaceRecommendation[],
  ): Promise<CourseGeneratorPlace[]> {
    const recommendationIds = recommendations.map(
      (recommendation) => recommendation.id,
    )
    const preferenceCounts =
      await this.voteRepository.getVoteCountsByRecommendation(
        this.dataSource.manager,
        recommendationIds,
      )

    return recommendations.map((recommendation) => {
      const counts = preferenceCounts.get(recommendation.id)
      return {
        id: recommendation.place.id,
        name: recommendation.place.name,
        category: recommendation.place.category.slug as CategorySlug,
        score: this.calculatePreferenceScore(
          counts?.likeCount ?? 0,
          counts?.dislikeCount ?? 0,
        ),
        tags: [], // TODO: 통계 DB의 PlaceTag가 연결되면 실제 태그로 교체
      }
    })
  }

  private buildMeetingDistanceMatrix(
    meeting: Meeting,
    visitOrder: readonly CategorySlug[],
    recommendations: readonly MeetingPlaceRecommendation[],
  ): Promise<Record<string, Record<string, number>>> {
    const placesByCategory = new Map<CategorySlug, DistanceMatrixPlace[]>()
    const coordinateByPlaceId = new Map<string, Coordinate>()

    for (const recommendation of recommendations) {
      const { place } = recommendation
      const category = place.category.slug as CategorySlug
      const group = placesByCategory.get(category) ?? []
      group.push({ id: place.id })
      placesByCategory.set(category, group)
      coordinateByPlaceId.set(place.id, {
        longitude: place.longitude,
        latitude: place.latitude,
      })
    }
    coordinateByPlaceId.set(START_NODE_ID, {
      longitude: meeting.meetingLocation.longitude,
      latitude: meeting.meetingLocation.latitude,
    })

    const positionPools = visitOrder.map(
      (category) => placesByCategory.get(category) ?? [],
    )

    return buildDistanceMatrixValues(positionPools, (fromId, toId) =>
      this.getWalkingDistanceMeters(
        coordinateByPlaceId.get(fromId),
        coordinateByPlaceId.get(toId),
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
   * `date`는 TypeORM의 `date` 컬럼에서 읽은 "YYYY-MM-DD" 문자열이다.
   * 시간대 영향 없이 순수 달력 날짜의 요일만 판단하기 위해 UTC 기준으로 계산한다.
   */
  private isWeekendDate(date: string): boolean {
    const [year, month, day] = date.split('-').map(Number)
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    return dayOfWeek === SATURDAY || dayOfWeek === SUNDAY
  }
}
