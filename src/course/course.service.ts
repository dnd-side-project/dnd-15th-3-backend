import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import type { Category } from 'src/category/entities/category.entity'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { ErrorCode } from 'src/common/exception/error-code.type'
import { KakaoWalkingCourseService } from 'src/kakao/kakao-walking-course.service'
import type { KakaoWalkingCourseResponse } from 'src/kakao/schema/walking-course-response.schema'
import { MeetingAccessService } from 'src/meeting/access/meeting-access.service'
import {
  COURSE_CANDIDATES_VISIBLE_STATUSES,
  COURSE_COMMENT_CREATABLE_STATUSES,
  COURSE_COMMENTS_VISIBLE_STATUSES,
  COURSE_DETAIL_VISIBLE_STATUSES,
  COURSE_PLACE_ADDABLE_STATUSES,
  COURSE_PLACES_REPLACEABLE_STATUSES,
} from 'src/meeting/constants/meeting-status.constants'
import { MeetingPlaceRecommendationDto } from 'src/meeting/dto/meeting-place-recommendation.dto'
import { MeetingStatusResponseDto } from 'src/meeting/dto/meeting-status-response.dto'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import type { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { MeetingException } from 'src/meeting/exception/meeting.exception'
import { MeetingErrorCode } from 'src/meeting/exception/meeting-error-code'
import { OutboxAggregateType } from 'src/outbox/constants/outbox-aggregate-type.constant'
import { OutboxEventType } from 'src/outbox/constants/outbox-event-type.constant'
import { OutboxEventRepository } from 'src/outbox/outbox-event.repository'
import {
  COURSE_CONFIRMED_PAYLOAD_VERSION,
  CourseConfirmedPayloadSchema,
} from 'src/outbox/schemas/course-confirmed-payload.schema'
import type { Place } from 'src/place/entities/place.entity'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import { PlaceImageService } from 'src/place/place-image.service'
import {
  PlaceLiveDataService,
  type ResolvedPlace,
} from 'src/place/place-live-data.service'
import { DataSource, type EntityManager, In, Repository } from 'typeorm'
import { CourseRepository } from './course.repository'
import { AddCoursePlaceRequestDto } from './dto/add-course-place-request.dto'
import { CourseCandidateListResponseDto } from './dto/course-candidate-list-response.dto'
import { CourseCommentDto } from './dto/course-comment.dto'
import { CourseDetailResponseDto } from './dto/course-detail-response.dto'
import { CreateCourseCommentRequestDto } from './dto/create-course-comment-request.dto'
import { CreateCourseCommentResponseDto } from './dto/create-course-comment-response.dto'
import { ExcludedPlaceListResponseDto } from './dto/excluded-place-list-response.dto'
import { UpdateCoursePlacesRequestDto } from './dto/update-course-places-request.dto'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidateComment } from './entities/course-candidate-comment.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseCategoryStep } from './entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from './entities/meeting-place-recommendation.entity'
import { CourseException } from './exception/course.exception'
import { CourseErrorCode } from './exception/course-error-code'
import { MeetingPlaceRecommendationRepository } from './meeting-place-recommendation.repository'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'
import {
  metersToKilometers,
  secondsToMinutes,
} from './utils/course-route.utils'

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly meetingAccessService: MeetingAccessService,
    private readonly voteRepository: MeetingPlaceRecommendationVoteRepository,
    private readonly recommendationRepository: MeetingPlaceRecommendationRepository,
    @InjectRepository(CourseCandidate)
    private readonly courseCandidateRepository: Repository<CourseCandidate>,
    @InjectRepository(CourseCandidateComment)
    private readonly commentRepository: Repository<CourseCandidateComment>,
    @InjectRepository(CourseCandidatePlace)
    private readonly courseCandidatePlaceRepository: Repository<CourseCandidatePlace>,
    private readonly placeImageService: PlaceImageService,
    private readonly placeLiveDataService: PlaceLiveDataService,
    private readonly kakaoWalkingCourseService: KakaoWalkingCourseService,
    private readonly courseRepository: CourseRepository,
    private readonly outboxEventRepository: OutboxEventRepository,
  ) {}

  async getCourseCandidates(
    meetingId: string,
    accessToken: string,
  ): Promise<CourseCandidateListResponseDto> {
    const { meeting } = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    meeting.assertStatus(
      COURSE_CANDIDATES_VISIBLE_STATUSES,
      MeetingErrorCode.courseCandidatesNotVisible,
    )

    const candidates = await this.courseCandidateRepository.find({
      where: { meeting: { id: meetingId } },
      order: { order: 'ASC' },
    })
    if (candidates.length === 0) {
      throw new CourseException(CourseErrorCode.courseCandidatesMissing)
    }

    return {
      courseCandidates: candidates.map((candidate) => ({
        courseCandidateId: candidate.id,
        order: candidate.order,
      })),
      totalCount: candidates.length,
    }
  }

  async getCourseDetail(
    meetingId: string,
    courseCandidateId: string,
    accessToken: string,
  ): Promise<CourseDetailResponseDto> {
    const viewer = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    viewer.meeting.assertStatus(
      COURSE_DETAIL_VISIBLE_STATUSES,
      MeetingErrorCode.courseDetailNotVisible,
    )

    const candidate = await this.courseCandidateRepository.findOne({
      where: { id: courseCandidateId, meeting: { id: meetingId } },
    })
    if (!candidate) {
      throw new CourseException(CourseErrorCode.candidateNotFound)
    }

    const steps = await this.courseCandidatePlaceRepository.find({
      where: { courseCandidate: { id: courseCandidateId } },
      relations: {
        meetingPlaceRecommendation: { place: { category: true } },
      },
      order: { order: 'ASC' },
    })
    if (steps.length === 0) {
      throw new CourseException(CourseErrorCode.routeMissing)
    }

    return this.buildCourseDetailResponse(meetingId, candidate, steps)
  }

  async getCourseComments(
    meetingId: string,
    courseCandidateId: string,
    accessToken: string,
  ): Promise<CourseCommentDto[]> {
    const viewer = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    viewer.meeting.assertStatus(
      COURSE_COMMENTS_VISIBLE_STATUSES,
      MeetingErrorCode.courseCommentsNotVisible,
    )
    await this.assertCourseCandidateExists(courseCandidateId, meetingId)

    const comments = await this.commentRepository.find({
      where: { courseCandidate: { id: courseCandidateId } },
      relations: { participant: true },
      order: { createdAt: 'ASC' },
    })

    return comments.map((comment) => ({
      commentId: comment.id,
      nickname: comment.participant.nickname,
      profileAvatarId: comment.participant.profileAvatarId,
      authorRole: comment.participant.role,
      isMine: comment.participant.equals(viewer),
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    }))
  }

  async createCourseComment(
    meetingId: string,
    courseCandidateId: string,
    accessToken: string,
    request: CreateCourseCommentRequestDto,
  ): Promise<CreateCourseCommentResponseDto> {
    const viewer = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    viewer.meeting.assertStatus(
      COURSE_COMMENT_CREATABLE_STATUSES,
      MeetingErrorCode.courseCommentNotCreatable,
    )
    await this.assertCourseCandidateExists(courseCandidateId, meetingId)

    const comment = await this.commentRepository.save(
      this.commentRepository.create({
        courseCandidate: { id: courseCandidateId } as CourseCandidate,
        participant: { id: viewer.id } as MeetingParticipant,
        content: request.content,
      }),
    )

    return {
      commentId: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    }
  }

  async confirmCourse(
    meetingId: string,
    courseCandidateId: string,
    accessToken: string,
  ): Promise<MeetingStatusResponseDto> {
    await this.assertHostParticipant(
      meetingId,
      accessToken,
      MeetingErrorCode.courseConfirmHostOnly,
    )

    return await this.dataSource.transaction(async (manager) => {
      const meeting = await this.courseRepository.lockMeeting(
        manager,
        meetingId,
      )
      if (!meeting) {
        throw new MeetingException(MeetingErrorCode.notFound)
      }
      meeting.confirm()

      const candidateRepository = manager.getRepository(CourseCandidate)
      const candidate = await candidateRepository.findOne({
        where: { id: courseCandidateId, meeting: { id: meetingId } },
        relations: { generationRun: true },
      })
      if (!candidate) {
        throw new CourseException(CourseErrorCode.candidateNotFound)
      }
      candidate.select()

      await candidateRepository.save(candidate)
      await manager.getRepository(Meeting).save(meeting)

      await this.recordCourseConfirmedEvent(
        manager,
        meeting,
        meetingId,
        candidate,
      )

      return {
        status: meeting.status,
        confirmedCourseCandidateId: candidate.id,
      }
    })
  }

  private async recordCourseConfirmedEvent(
    manager: EntityManager,
    meeting: Meeting,
    meetingId: string,
    courseCandidate: CourseCandidate,
  ): Promise<void> {
    const steps = await this.loadCourseStepsOrThrow(manager, courseCandidate.id)
    const recommendationIds = steps.map(
      (step) => step.meetingPlaceRecommendation.id,
    )

    const [participantCount, voteCounts] = await Promise.all([
      this.courseRepository.countParticipants(manager, meetingId),
      this.voteRepository.getVoteCountsByRecommendation(
        manager,
        recommendationIds,
      ),
    ])

    let payload: Record<string, unknown>
    try {
      payload = CourseConfirmedPayloadSchema.parse({
        meetingId,
        meetingTypeId: meeting.meetingType.id,
        meetingDate: meeting.date,
        meetingTime: meeting.time,
        courseVersion: meeting.courseVersion,
        payloadVersion: COURSE_CONFIRMED_PAYLOAD_VERSION,
        participantCount,
        courseGeneration: courseCandidate.generationRun
          ? {
              runId: courseCandidate.generationRun.id,
              inputHash: courseCandidate.generationRun.inputHash,
              customizationType:
                courseCandidate.generationRun.customizationType,
              questionnaire: courseCandidate.generationRun.inputSnapshot
                .questionnaire
                ? {
                    questionnaireId:
                      courseCandidate.generationRun.inputSnapshot.questionnaire
                        .questionnaireId,
                    questionnaireVersion:
                      courseCandidate.generationRun.inputSnapshot.questionnaire
                        .questionnaireVersion,
                    schemaVersion:
                      courseCandidate.generationRun.inputSnapshot.questionnaire
                        .schemaVersion,
                    promptVersion:
                      courseCandidate.generationRun.inputSnapshot.questionnaire
                        .promptVersion,
                    source:
                      courseCandidate.generationRun.inputSnapshot.questionnaire
                        .source,
                    provider:
                      courseCandidate.generationRun.inputSnapshot.questionnaire
                        .provider,
                    model:
                      courseCandidate.generationRun.inputSnapshot.questionnaire
                        .model,
                    answers:
                      courseCandidate.generationRun.inputSnapshot.questionnaire.answers.map(
                        (answer) => ({
                          questionCode: answer.questionCode,
                          questionText: answer.questionText,
                          optionCode: answer.optionCode,
                          optionLabel: answer.optionLabel,
                        }),
                      ),
                  }
                : null,
            }
          : null,
        places: steps.map((step) => {
          const place = step.meetingPlaceRecommendation.place
          const counts = voteCounts.get(step.meetingPlaceRecommendation.id)
          return {
            placeId: place.id,
            placeCategoryId: place.category.id,
            likeCount: counts?.likeCount ?? 0,
            dislikeCount: counts?.dislikeCount ?? 0,
          }
        }),
      })
    } catch (error) {
      this.logger.error(
        `코스 확정 outbox 이벤트 payload 검증에 실패했습니다. meetingId=${meetingId} courseCandidateId=${courseCandidate.id}`,
        error instanceof Error ? error.stack : error,
      )
      throw new CourseException(CourseErrorCode.courseConfirmedEventInvalid)
    }

    await this.outboxEventRepository.create(manager, {
      eventType: OutboxEventType.courseConfirmed,
      aggregateType: OutboxAggregateType.meeting,
      aggregateId: meetingId,
      payload,
    })
  }

  async getExcludedPlaces(
    meetingId: string,
    courseCandidateId: string,
    accessToken: string,
    category: CategorySlug | undefined,
  ): Promise<ExcludedPlaceListResponseDto> {
    const viewer = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    viewer.meeting.assertStatus(
      COURSE_CANDIDATES_VISIBLE_STATUSES,
      MeetingErrorCode.excludedPlacesNotVisible,
    )
    await this.assertCourseCandidateExists(courseCandidateId, meetingId)

    const recommendations =
      await this.recommendationRepository.findExcludedFromCourse(
        meetingId,
        courseCandidateId,
        category,
      )
    const recommendationIds = recommendations.map(
      (recommendation) => recommendation.id,
    )

    const [preferenceSummaries, primaryImageUrls, resolved] = await Promise.all(
      [
        this.voteRepository.getPreferenceSummaries(
          recommendationIds,
          viewer.id,
        ),
        this.placeImageService.getPrimaryImageUrls(
          recommendations.map((recommendation) => recommendation.place.id),
        ),
        this.resolvePlacesForMeeting(
          meetingId,
          recommendations.map((recommendation) => recommendation.place),
        ),
      ],
    )

    const items: MeetingPlaceRecommendationDto[] = recommendations.map(
      (recommendation) => {
        const summary = preferenceSummaries.get(recommendation.id)
        const place = resolved.get(recommendation.place.id)!
        return {
          recommendationId: recommendation.id,
          category: place.category.name,
          categorySlug: place.category.slug as CategorySlug,
          name: place.name,
          address: place.address,
          primaryImageUrl: primaryImageUrls.get(recommendation.place.id),
          likeCount: summary?.likeCount ?? 0,
          dislikeCount: summary?.dislikeCount ?? 0,
          myPreference: summary?.myPreference ?? null,
        }
      },
    )

    return {
      items,
      totalCount: items.length,
      appliedCategory: category ?? null,
    }
  }

  async addCoursePlace(
    meetingId: string,
    courseCandidateId: string,
    accessToken: string,
    request: AddCoursePlaceRequestDto,
  ): Promise<CourseDetailResponseDto> {
    await this.assertHostParticipant(
      meetingId,
      accessToken,
      MeetingErrorCode.courseEditHostOnly,
    )

    const { candidate, steps } = await this.dataSource.transaction(
      async (manager) => {
        const meeting = await this.lockMeetingOrThrow(
          manager,
          meetingId,
          COURSE_PLACE_ADDABLE_STATUSES,
          MeetingErrorCode.coursePlaceNotAddable,
        )
        const candidate = await this.loadCourseCandidateOrThrow(
          manager,
          meetingId,
          courseCandidateId,
        )
        const recommendation = await this.loadRecommendationOrThrow(
          manager,
          meetingId,
          request.recommendationId,
        )
        const steps = await this.loadCourseStepsOrThrow(
          manager,
          courseCandidateId,
        )
        this.assertPlaceCanBeAdded(steps, recommendation.id)

        const updatedSteps = await this.appendPlaceToCourse(manager, {
          meeting,
          meetingId,
          courseCandidateId,
          steps,
          recommendation,
        })

        return { candidate, steps: updatedSteps }
      },
    )

    return this.buildCourseDetailResponse(meetingId, candidate, steps)
  }

  async updateCoursePlaces(
    meetingId: string,
    courseCandidateId: string,
    accessToken: string,
    request: UpdateCoursePlacesRequestDto,
  ): Promise<CourseDetailResponseDto> {
    await this.assertHostParticipant(
      meetingId,
      accessToken,
      MeetingErrorCode.courseEditHostOnly,
    )

    const { candidate, steps } = await this.dataSource.transaction(
      async (manager) => {
        const meeting = await this.lockMeetingOrThrow(
          manager,
          meetingId,
          COURSE_PLACES_REPLACEABLE_STATUSES,
          MeetingErrorCode.coursePlacesNotReplaceable,
        )
        const candidate = await this.loadCourseCandidateOrThrow(
          manager,
          meetingId,
          courseCandidateId,
        )
        const recommendations = await this.loadRecommendationsInOrderOrThrow(
          manager,
          meetingId,
          request.recommendationIds,
        )

        const updatedSteps = await this.replaceCoursePlaces(manager, {
          meeting,
          meetingId,
          courseCandidateId,
          recommendations,
        })

        return { candidate, steps: updatedSteps }
      },
    )

    return this.buildCourseDetailResponse(meetingId, candidate, steps)
  }

  private async assertHostParticipant(
    meetingId: string,
    accessToken: string,
    errorCode: ErrorCode,
  ): Promise<MeetingParticipant> {
    const participant = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    participant.assertHost(errorCode)
    return participant
  }

  private async lockMeetingOrThrow(
    manager: EntityManager,
    meetingId: string,
    allowedStatuses: readonly MeetingStatus[],
    statusErrorCode: ErrorCode,
  ): Promise<Meeting> {
    const meeting = await this.courseRepository.lockMeeting(manager, meetingId)
    if (!meeting) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }
    meeting.assertStatus(allowedStatuses, statusErrorCode)
    return meeting
  }

  private async loadCourseCandidateOrThrow(
    manager: EntityManager,
    meetingId: string,
    courseCandidateId: string,
  ): Promise<CourseCandidate> {
    const candidate = await manager.getRepository(CourseCandidate).findOne({
      where: { id: courseCandidateId, meeting: { id: meetingId } },
    })
    if (!candidate) {
      throw new CourseException(CourseErrorCode.candidateNotFound)
    }
    return candidate
  }

  private async loadRecommendationOrThrow(
    manager: EntityManager,
    meetingId: string,
    recommendationId: string,
  ): Promise<MeetingPlaceRecommendation> {
    const recommendation = await manager
      .getRepository(MeetingPlaceRecommendation)
      .findOne({
        where: { id: recommendationId, meeting: { id: meetingId } },
        relations: { place: { category: true } },
      })
    if (!recommendation) {
      throw new CourseException(CourseErrorCode.recommendationNotFound)
    }
    return recommendation
  }

  private async loadCourseStepsOrThrow(
    manager: EntityManager,
    courseCandidateId: string,
  ): Promise<CourseCandidatePlace[]> {
    const steps = await manager.getRepository(CourseCandidatePlace).find({
      where: { courseCandidate: { id: courseCandidateId } },
      relations: {
        meetingPlaceRecommendation: { place: { category: true } },
      },
      order: { order: 'ASC' },
    })
    if (steps.length === 0) {
      throw new CourseException(CourseErrorCode.routeMissing)
    }
    return steps
  }

  private assertPlaceCanBeAdded(
    steps: CourseCandidatePlace[],
    recommendationId: string,
  ): void {
    const alreadyIncluded = steps.some(
      (step) => step.meetingPlaceRecommendation.id === recommendationId,
    )
    if (alreadyIncluded) {
      throw new CourseException(CourseErrorCode.alreadyIncludedInCourse)
    }
    if (steps.length >= MAX_COURSE_STEPS) {
      throw new CourseException(CourseErrorCode.courseStepsFull)
    }
  }

  private async appendPlaceToCourse(
    manager: EntityManager,
    params: {
      meeting: Meeting
      meetingId: string
      courseCandidateId: string
      steps: CourseCandidatePlace[]
      recommendation: MeetingPlaceRecommendation
    },
  ): Promise<CourseCandidatePlace[]> {
    const { meeting, meetingId, courseCandidateId, steps, recommendation } =
      params
    const lastStep = steps[steps.length - 1]
    const lastReference = lastStep.meetingPlaceRecommendation.place
    const newReference = recommendation.place
    const resolved = await this.resolvePlacesForMeeting(meetingId, [
      lastReference,
      newReference,
    ])
    const lastPlace = resolved.get(lastReference.id)!
    const newPlace = resolved.get(newReference.id)!

    const walkingCourse = await this.getWalkingCourseOrThrow(
      lastPlace,
      newPlace,
    )

    const placeRepository = manager.getRepository(CourseCandidatePlace)
    lastStep.travelTimeToNext = walkingCourse.totalTime
    lastStep.distanceToNextMeters = walkingCourse.totalDistance

    const newStepEntity = placeRepository.create({
      courseCandidate: { id: courseCandidateId } as CourseCandidate,
      meetingPlaceRecommendation: {
        id: recommendation.id,
      } as MeetingPlaceRecommendation,
      order: lastStep.order + 1,
      travelTimeToNext: null,
      distanceToNextMeters: null,
    })
    const [, newStep] = await placeRepository.save([lastStep, newStepEntity])
    newStep.meetingPlaceRecommendation = recommendation

    await this.appendCategoryStep(manager, meetingId, newPlace.category)

    meeting.bumpCourseVersion()
    await manager.getRepository(Meeting).save(meeting)

    return [...steps.slice(0, -1), lastStep, newStep]
  }

  private async appendCategoryStep(
    manager: EntityManager,
    meetingId: string,
    category: Category,
  ): Promise<void> {
    const categoryStepRepository = manager.getRepository(CourseCategoryStep)
    const existingCategorySteps = await categoryStepRepository.find({
      where: { meeting: { id: meetingId } },
      order: { order: 'DESC' },
      take: 1,
    })
    await categoryStepRepository.save(
      categoryStepRepository.create({
        meeting: { id: meetingId } as Meeting,
        category,
        order: (existingCategorySteps[0]?.order ?? 0) + 1,
      }),
    )
  }

  private async loadRecommendationsInOrderOrThrow(
    manager: EntityManager,
    meetingId: string,
    recommendationIds: string[],
  ): Promise<MeetingPlaceRecommendation[]> {
    const recommendations = await manager
      .getRepository(MeetingPlaceRecommendation)
      .find({
        where: { id: In(recommendationIds), meeting: { id: meetingId } },
        relations: { place: { category: true } },
      })
    const recommendationsById = new Map(
      recommendations.map((recommendation) => [
        recommendation.id,
        recommendation,
      ]),
    )
    const ordered = recommendationIds.map((id) => recommendationsById.get(id))
    if (ordered.some((recommendation) => !recommendation)) {
      throw new CourseException(CourseErrorCode.recommendationNotFound)
    }
    return ordered as MeetingPlaceRecommendation[]
  }

  private async getWalkingLegsOrThrow(
    meetingId: string,
    places: Place[],
  ): Promise<Array<{ totalTime: number; totalDistance: number } | null>> {
    const resolved = await this.resolvePlacesForMeeting(meetingId, places)
    const livePlaces = places.map((place) => resolved.get(place.id)!)
    const legs = await Promise.all(
      livePlaces
        .slice(0, -1)
        .map((place, index) =>
          this.getWalkingCourseOrThrow(place, livePlaces[index + 1]),
        ),
    )
    return [...legs, null]
  }

  private async replaceCourseCategorySteps(
    manager: EntityManager,
    meetingId: string,
    categories: Category[],
  ): Promise<void> {
    await this.courseRepository.deleteCourseCategorySteps(manager, meetingId)

    const categoryStepRepository = manager.getRepository(CourseCategoryStep)
    await categoryStepRepository.save(
      categories.map((category, index) =>
        categoryStepRepository.create({
          meeting: { id: meetingId } as Meeting,
          category,
          order: index + 1,
        }),
      ),
    )
  }

  private async replaceCoursePlaces(
    manager: EntityManager,
    params: {
      meeting: Meeting
      meetingId: string
      courseCandidateId: string
      recommendations: MeetingPlaceRecommendation[]
    },
  ): Promise<CourseCandidatePlace[]> {
    const { meeting, meetingId, courseCandidateId, recommendations } = params
    const places = recommendations.map((recommendation) => recommendation.place)
    const legs = await this.getWalkingLegsOrThrow(meetingId, places)

    await this.courseRepository.deleteCourseCandidatePlaces(
      manager,
      courseCandidateId,
    )

    const placeRepository = manager.getRepository(CourseCandidatePlace)
    const newSteps = await placeRepository.save(
      recommendations.map((recommendation, index) =>
        placeRepository.create({
          courseCandidate: { id: courseCandidateId } as CourseCandidate,
          meetingPlaceRecommendation: {
            id: recommendation.id,
          } as MeetingPlaceRecommendation,
          order: index + 1,
          travelTimeToNext: legs[index]?.totalTime ?? null,
          distanceToNextMeters: legs[index]?.totalDistance ?? null,
        }),
      ),
    )
    newSteps.forEach((step, index) => {
      step.meetingPlaceRecommendation = recommendations[index]
    })

    await this.replaceCourseCategorySteps(
      manager,
      meetingId,
      recommendations.map((recommendation) => recommendation.place.category),
    )

    meeting.bumpCourseVersion()
    await manager.getRepository(Meeting).save(meeting)

    return newSteps
  }

  private async getWalkingCourseOrThrow(
    origin: ResolvedPlace,
    destination: ResolvedPlace,
  ): Promise<{ totalTime: number; totalDistance: number }> {
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
      this.logger.error(
        `카카오 도보 경로 API 호출에 실패했습니다. origin=(${origin.longitude}, ${origin.latitude}) destination=(${destination.longitude}, ${destination.latitude})`,
        error instanceof Error ? error.stack : error,
      )
      throw new CourseException(CourseErrorCode.walkingCourseUnavailable)
    }

    if (walkingCourse.status !== 'OK' || !walkingCourse.route) {
      this.logger.error(
        `두 장소 사이의 도보 경로를 찾을 수 없습니다. status=${walkingCourse.status} ` +
          `origin=(${origin.longitude}, ${origin.latitude}) destination=(${destination.longitude}, ${destination.latitude})`,
      )
      throw new CourseException(CourseErrorCode.walkingCourseUnavailable)
    }

    return {
      totalTime: walkingCourse.route.properties.totalTime,
      totalDistance: walkingCourse.route.properties.totalDistance,
    }
  }

  private async assertCourseCandidateExists(
    courseCandidateId: string,
    meetingId: string,
  ): Promise<void> {
    const exists = await this.courseCandidateRepository.exists({
      where: { id: courseCandidateId, meeting: { id: meetingId } },
    })
    if (!exists) {
      throw new CourseException(CourseErrorCode.candidateNotFound)
    }
  }

  private async buildCourseDetailResponse(
    meetingId: string,
    candidate: CourseCandidate,
    steps: CourseCandidatePlace[],
  ): Promise<CourseDetailResponseDto> {
    const places = steps.map((step) => step.meetingPlaceRecommendation.place)
    const [primaryImageUrls, resolved] = await Promise.all([
      this.placeImageService.getPrimaryImageUrls(
        places.map((place) => place.id),
      ),
      this.resolvePlacesForMeeting(meetingId, places),
    ])

    const totalDistanceMeters = steps.reduce(
      (sum, step) => sum + (step.distanceToNextMeters ?? 0),
      0,
    )

    return {
      courseName: candidate.name,
      totalDistanceKm: metersToKilometers(totalDistanceMeters),
      totalCount: steps.length,
      route: steps.map((step) => {
        const reference = step.meetingPlaceRecommendation.place
        const place = resolved.get(reference.id)!
        return {
          recommendationId: step.meetingPlaceRecommendation.id,
          placeId: place.id,
          order: step.order,
          name: place.name,
          category: place.category.name,
          categorySlug: place.category.slug as CategorySlug,
          address: place.address,
          primaryImageUrl: primaryImageUrls.get(reference.id) ?? null,
          longitude: place.longitude,
          latitude: place.latitude,
          walkDurationToNextMin: secondsToMinutes(step.travelTimeToNext),
          source: place.source,
          providerPlaceId: place.providerPlaceId,
          placeUrl: place.placeUrl,
        }
      }),
    }
  }

  private async resolvePlacesForMeeting(
    meetingId: string,
    places: Place[],
  ): Promise<Map<string, ResolvedPlace>> {
    if (places.every((place) => place.source !== PlaceSource.Kakao)) {
      return this.placeLiveDataService.resolvePlaces(places, {
        latitude: 0,
        longitude: 0,
      })
    }
    const meeting = await this.dataSource.getRepository(Meeting).findOne({
      where: { id: meetingId },
      relations: { meetingLocation: true },
    })
    if (!meeting) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }
    meeting.assertHasLocation()
    return this.placeLiveDataService.resolvePlaces(
      places,
      meeting.meetingLocation,
    )
  }
}
