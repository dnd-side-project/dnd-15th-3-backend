import { randomBytes } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { SimilarPlaceResponseDto } from 'src/catalog/dto/similar-place-response.dto'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { Category } from 'src/category/entities/category.entity'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { type Env } from 'src/config/env'
import { CourseCandidate } from 'src/course/entities/course-candidate.entity'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { PreferenceType } from 'src/course/enums/preference-type.enum'
import { MeetingPlaceRecommendationVoteRepository } from 'src/course/meeting-place-recommendation-vote.repository'
import { MediaService } from 'src/media/media.service'
import { MapPinDto } from 'src/place/dto/map-pin.dto'
import { MapPinsResponseDto } from 'src/place/dto/map-pins-response.dto'
import { Place } from 'src/place/entities/place.entity'
import { PlaceSyncJob } from 'src/place/entities/place-sync-job.entity'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import { PlaceSyncJobStatus } from 'src/place/enums/place-sync-job-status.enum'
import { PlacePhotoService } from 'src/place/photo/place-photo.service'
import {
  PlaceRepository,
  SIMILAR_PLACE_CANDIDATE_POOL_SIZE,
  shuffle,
} from 'src/place/place.repository'
import {
  PlaceLiveDataService,
  type ResolvedPlace,
} from 'src/place/place-live-data.service'
import {
  haversineDistanceMeters,
  PLACE_SYNC_RADIUS_METERS,
} from 'src/place/sync/place-sync.constants'
import { User } from 'src/user/entities/user.entity'
import { DataSource, type EntityManager, In, Repository } from 'typeorm'
import { MeetingAccessService } from './access/meeting-access.service'
import {
  MAP_PINS_VISIBLE_STATUSES,
  PLACE_PREFERENCE_EDITABLE_STATUSES,
  SIMILAR_PLACES_RECOMMENDABLE_STATUSES,
} from './constants/meeting-status.constants'
import { CourseImageResponseDto } from './dto/course-image-response.dto'
import { CoursePlanResponseDto } from './dto/course-plan-response.dto'
import { MeetingInvitationResponseDto } from './dto/meeting-invitation-response.dto'
import { MeetingLocationResponseDto } from './dto/meeting-location.dto'
import { MeetingScreenResponseDto } from './dto/meeting-screen-response.dto'
import { MeetingStatusResponseDto } from './dto/meeting-status-response.dto'
import { PlacePreferenceResponseDto } from './dto/place-preference-response.dto'
import { RecommendationPreviewDto } from './dto/recommendation-preview.dto'
import { Meeting } from './entities/meeting.entity'
import { MeetingLocation } from './entities/meeting-location.entity'
import { MeetingParticipant } from './entities/meeting-participant.entity'
import { MeetingType } from './entities/meeting-type.entity'
import { MeetingStatus } from './enums/meeting-status.enum'
import { ParticipantRole } from './enums/participant-role.enum'
import { MeetingException } from './exception/meeting.exception'
import { MeetingErrorCode } from './exception/meeting-error-code'
import type {
  CreateMeetingRequest,
  InvitationPreviewRequest,
  JoinMeetingRequest,
  MeetingLocationInput,
  UpdateCoursePlanRequest,
} from './schema/meeting-request.schema'
import type { AddRecommendationRequest } from './schema/recommendation-request.schema'

const INVITATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_SIMILAR_PLACES_SIZE = 100

export type CourseImageFile = {
  buffer: Buffer
  mimetype: string
}

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name)

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly dataSource: DataSource,
    private readonly mediaService: MediaService,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    @InjectRepository(MeetingPlaceRecommendation)
    private readonly recommendationRepository: Repository<MeetingPlaceRecommendation>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(CourseCandidate)
    private readonly courseCandidateRepository: Repository<CourseCandidate>,
    private readonly voteRepository: MeetingPlaceRecommendationVoteRepository,
    private readonly meetingAccessService: MeetingAccessService,
    private readonly placeSearchRepository: PlaceRepository,
    private readonly placePhotoService: PlacePhotoService,
    private readonly placeLiveDataService: PlaceLiveDataService,
  ) {}

  async createMeeting(
    request: CreateMeetingRequest,
  ): Promise<MeetingScreenResponseDto> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const created = await this.createMeetingInTransaction(request)
        return this.toMeetingScreenResponse(created, request)
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error
      }
    }

    throw new MeetingException(MeetingErrorCode.invitationCodeIssuanceFailed)
  }

  private createMeetingInTransaction(request: CreateMeetingRequest): Promise<{
    meeting: Meeting
    location: MeetingLocation
    steps: CourseCategoryStep[]
    participant: MeetingParticipant
    user: User
  }> {
    return this.dataSource.transaction(async (manager) => {
      const meetingTypeRepository = manager.getRepository(MeetingType)
      const categoryRepository = manager.getRepository(Category)
      const meetingRepository = manager.getRepository(Meeting)
      const locationRepository = manager.getRepository(MeetingLocation)
      const participantRepository = manager.getRepository(MeetingParticipant)
      const stepRepository = manager.getRepository(CourseCategoryStep)

      const meetingType = await meetingTypeRepository.findOne({
        where: { code: request.meetingTypeCode },
      })
      if (!meetingType) {
        throw new MeetingException(MeetingErrorCode.meetingTypeNotFound)
      }

      const categories = await categoryRepository.find({
        where: { slug: In(request.categorySlugs) },
      })
      if (categories.length !== new Set(request.categorySlugs).size) {
        throw new MeetingException(MeetingErrorCode.invalidCourseCategory)
      }
      const categoriesBySlug = new Map(
        categories.map((category) => [category.slug, category]),
      )

      const user = await this.findOrCreateUser(manager, request.host.userKey)

      const meeting = await meetingRepository.save(
        meetingRepository.create({
          meetingType,
          name: request.name,
          date: request.date,
          time: request.time,
          accessToken: this.generateInvitationCode(),
        }),
      )

      const location = await locationRepository.save(
        locationRepository.create({
          meeting,
          displayName: request.firstMeetingLocation.displayName,
          address: request.firstMeetingLocation.address,
          latitude: request.firstMeetingLocation.latitude,
          longitude: request.firstMeetingLocation.longitude,
          externalAddressId:
            request.firstMeetingLocation.externalAddressId ?? null,
          syncVersion: 1,
          location: {
            type: 'Point',
            coordinates: [
              request.firstMeetingLocation.longitude,
              request.firstMeetingLocation.latitude,
            ],
          },
        }),
      )

      const steps = await stepRepository.save(
        request.categorySlugs.map((slug, index) =>
          stepRepository.create({
            meeting,
            category: categoriesBySlug.get(slug)!,
            order: index + 1,
          }),
        ),
      )
      const participant = await participantRepository.save(
        participantRepository.create({
          meeting,
          user,
          role: ParticipantRole.Host,
          nickname: request.host.nickname,
          accessToken: this.generateParticipantToken(),
          profileAvatarId: request.host.profileAvatarId,
        }),
      )

      return { meeting, location, steps, participant, user }
    })
  }

  async previewInvitation(
    request: InvitationPreviewRequest,
  ): Promise<MeetingInvitationResponseDto> {
    const meeting = await this.dataSource.getRepository(Meeting).findOne({
      where: {
        accessToken: this.normalizeInvitationCode(request.invitationCode),
      },
      relations: { meetingLocation: true },
    })
    if (!meeting || !meeting.meetingLocation) {
      throw new MeetingException(MeetingErrorCode.invitationNotFound)
    }

    return this.toInvitationResponse(meeting)
  }

  async joinMeeting(
    request: JoinMeetingRequest,
  ): Promise<MeetingScreenResponseDto> {
    let joined: { meetingId: string; participantAccessToken: string }
    try {
      joined = await this.dataSource.transaction(async (manager) => {
        const meetingRepository = manager.getRepository(Meeting)
        const meeting = await meetingRepository.findOne({
          where: {
            accessToken: this.normalizeInvitationCode(request.invitationCode),
          },
          relations: { meetingType: true, meetingLocation: true },
        })
        if (!meeting || !meeting.meetingLocation) {
          throw new MeetingException(MeetingErrorCode.invitationNotFound)
        }

        const user = await this.findOrCreateUser(manager, request.userKey)

        const participantRepository = manager.getRepository(MeetingParticipant)
        let participant = await participantRepository.findOne({
          where: { meeting: { id: meeting.id }, user: { id: user.id } },
        })

        if (!participant) {
          const nicknameInUse = await participantRepository.findOne({
            where: { meeting: { id: meeting.id }, nickname: request.nickname },
          })
          if (nicknameInUse) {
            throw new MeetingException(MeetingErrorCode.nicknameAlreadyInUse)
          }

          await manager.query(
            `INSERT INTO "meeting_participant" ("role", "access_token", "nickname", "profile_avatar_id", "meeting_id", "user_id")
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT ("meeting_id", "user_id") DO NOTHING`,
            [
              ParticipantRole.Member,
              this.generateParticipantToken(),
              request.nickname,
              request.profileAvatarId,
              meeting.id,
              user.id,
            ],
          )
          participant = await participantRepository.findOne({
            where: { meeting: { id: meeting.id }, user: { id: user.id } },
          })
          if (!participant) {
            throw new MeetingException(MeetingErrorCode.nicknameAlreadyInUse)
          }
        } else {
          if (participant.nickname !== request.nickname) {
            const nicknameInUse = await participantRepository.findOne({
              where: {
                meeting: { id: meeting.id },
                nickname: request.nickname,
              },
            })
            if (nicknameInUse && nicknameInUse.id !== participant.id) {
              throw new MeetingException(MeetingErrorCode.nicknameAlreadyInUse)
            }
          }
          participant.nickname = request.nickname
          participant.profileAvatarId = request.profileAvatarId
          participant = await participantRepository.save(participant)
        }

        return {
          meetingId: meeting.id,
          participantAccessToken: participant.accessToken,
        }
      })
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new MeetingException(MeetingErrorCode.nicknameAlreadyInUse)
      }
      throw error
    }

    return this.getMeetingScreen(
      joined.meetingId,
      joined.participantAccessToken,
    )
  }

  getMeetingDetail(
    meetingId: string,
    accessToken: string,
  ): Promise<MeetingScreenResponseDto> {
    return this.getMeetingScreen(meetingId, accessToken)
  }

  async storeCourseImage(
    meetingId: string,
    accessToken: string,
    file: CourseImageFile,
  ): Promise<CourseImageResponseDto> {
    const participant = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    if (participant.role !== ParticipantRole.Host) {
      throw new MeetingException(MeetingErrorCode.hostOnly)
    }

    const meetingRepository = this.dataSource.getRepository(Meeting)
    const meeting = await meetingRepository.findOne({
      where: { id: meetingId },
    })
    if (!meeting) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }
    this.assertCourseImageState(meeting)

    if (meeting.courseImageKey) {
      return this.toCourseImageResponse(meeting)
    }

    const stored = await this.mediaService.storePublicImage({
      body: file.buffer,
      mimeType: file.mimetype,
    })
    const uploadedAt = new Date()

    let affected: number | null | undefined
    try {
      const updateResult = await meetingRepository
        .createQueryBuilder()
        .update(Meeting)
        .set({
          courseImageKey: stored.asset.objectKey,
          courseImageUploadedAt: uploadedAt,
        })
        .where('id = :meetingId', { meetingId })
        .andWhere('course_image_key IS NULL')
        .andWhere('status = :status', {
          status: MeetingStatus.CourseConfirmed,
        })
        .execute()
      affected = updateResult.affected
    } catch (error) {
      await this.discardCourseImage(stored.asset)
      throw error
    }

    if (affected === 1) {
      return { imageUrl: stored.publicUrl, uploadedAt }
    }

    await this.discardCourseImage(stored.asset)
    const winner = await meetingRepository.findOne({
      where: { id: meetingId },
    })
    if (!winner) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }
    this.assertCourseImageState(winner)
    return this.toCourseImageResponse(winner)
  }

  async downloadCourseImage(meetingId: string, accessToken: string) {
    await this.meetingAccessService.findParticipant(meetingId, accessToken)

    const meeting = await this.dataSource.getRepository(Meeting).findOne({
      where: { id: meetingId },
    })
    if (!meeting) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }
    if (!meeting.courseImageKey) {
      throw new MeetingException(MeetingErrorCode.courseImageNotFound)
    }

    return this.mediaService.downloadPublicImage(meeting.courseImageKey)
  }

  async getCoursePlan(
    meetingId: string,
    accessToken: string,
  ): Promise<CoursePlanResponseDto> {
    await this.meetingAccessService.findParticipant(meetingId, accessToken)

    const [meeting, steps] = await Promise.all([
      this.dataSource.getRepository(Meeting).findOne({
        where: { id: meetingId },
      }),
      this.dataSource.getRepository(CourseCategoryStep).find({
        where: { meeting: { id: meetingId } },
        relations: { category: true },
        order: { order: 'ASC' },
      }),
    ])
    if (!meeting) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }

    return this.toCoursePlanResponse(meeting, steps)
  }

  async updateCoursePlan(
    meetingId: string,
    accessToken: string,
    request: UpdateCoursePlanRequest,
  ): Promise<CoursePlanResponseDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const participant = await this.meetingAccessService.findParticipant(
        meetingId,
        accessToken,
        manager,
      )
      if (participant.role !== ParticipantRole.Host) {
        throw new MeetingException(MeetingErrorCode.hostOnly)
      }

      const categoryRepository = manager.getRepository(Category)
      const categories = await categoryRepository.find({
        where: { slug: In(request.categorySlugs) },
      })
      if (categories.length !== new Set(request.categorySlugs).size) {
        throw new MeetingException(MeetingErrorCode.invalidCourseCategory)
      }

      const meetingRepository = manager.getRepository(Meeting)
      const meeting = await meetingRepository
        .createQueryBuilder('meeting')
        .where('meeting.id = :meetingId', { meetingId })
        .setLock('pessimistic_write')
        .getOne()
      if (!meeting) {
        throw new MeetingException(MeetingErrorCode.notFound)
      }
      if (meeting.courseVersion !== request.version) {
        throw new MeetingException(MeetingErrorCode.staleCoursePlan)
      }

      const stepRepository = manager.getRepository(CourseCategoryStep)
      await stepRepository
        .createQueryBuilder()
        .delete()
        .from(CourseCategoryStep)
        .where('meeting_id = :meetingId', { meetingId })
        .execute()

      const categoriesBySlug = new Map(
        categories.map((category) => [category.slug, category]),
      )
      const steps = await stepRepository.save(
        request.categorySlugs.map((slug, index) =>
          stepRepository.create({
            meeting,
            category: categoriesBySlug.get(slug)!,
            order: index + 1,
          }),
        ),
      )

      meeting.courseVersion += 1
      const updatedMeeting = await meetingRepository.save(meeting)
      return { meeting: updatedMeeting, steps }
    })

    return this.toCoursePlanResponse(result.meeting, result.steps)
  }

  updateLocation(
    meetingId: string,
    accessToken: string,
    input: MeetingLocationInput,
  ): Promise<MeetingLocationResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const participant = await this.meetingAccessService.findParticipant(
        meetingId,
        accessToken,
        manager,
      )
      if (participant.role !== ParticipantRole.Host) {
        throw new MeetingException(MeetingErrorCode.hostOnly)
      }

      const locationRepository = manager.getRepository(MeetingLocation)
      const location = await locationRepository
        .createQueryBuilder('location')
        .where('location.meeting_id = :meetingId', { meetingId })
        .setLock('pessimistic_write')
        .getOne()
      if (!location) {
        throw new MeetingException(MeetingErrorCode.locationNotFound)
      }

      const nextVersion = location.syncVersion + 1
      location.displayName = input.displayName
      location.address = input.address
      location.latitude = input.latitude
      location.longitude = input.longitude
      location.externalAddressId = input.externalAddressId ?? null
      location.syncVersion = nextVersion
      location.location = {
        type: 'Point',
        coordinates: [input.longitude, input.latitude],
      }
      const updated = await locationRepository.save(location)

      await manager
        .getRepository(PlaceSyncJob)
        .createQueryBuilder()
        .update()
        .set({
          status: PlaceSyncJobStatus.Failed,
          errorMessage: '기준 위치가 변경되어 작업이 무효화되었습니다.',
          completedAt: new Date(),
        })
        .where('meeting_id = :meetingId', { meetingId })
        .andWhere('location_version < :version', { version: nextVersion })
        .andWhere('status IN (:...statuses)', {
          statuses: [PlaceSyncJobStatus.Pending, PlaceSyncJobStatus.Running],
        })
        .execute()

      return this.toMeetingLocationResponse(updated)
    })
  }

  async addRecommendation(
    meetingId: string,
    accessToken: string,
    request: AddRecommendationRequest,
  ): Promise<RecommendationPreviewDto> {
    const participant = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )

    const [location, place] = await Promise.all([
      this.dataSource.getRepository(MeetingLocation).findOne({
        where: { meeting: { id: meetingId } },
      }),
      this.placeRepository.findOne({
        where: { id: request.placeId },
        relations: { category: true },
      }),
    ])
    if (!location) {
      throw new MeetingException(MeetingErrorCode.locationNotFound)
    }
    if (!place) {
      throw new MeetingException(MeetingErrorCode.placeNotFound)
    }

    const resolvedPlace = await this.placeLiveDataService.resolvePlace(place, {
      latitude: location.latitude,
      longitude: location.longitude,
    })

    const categoryStep = await this.dataSource
      .getRepository(CourseCategoryStep)
      .findOne({
        where: {
          meeting: { id: meetingId },
          category: { id: place.category.id },
        },
      })
    if (!categoryStep) {
      throw new MeetingException(MeetingErrorCode.placeCategoryMismatch)
    }

    if (
      haversineDistanceMeters(
        location.latitude,
        location.longitude,
        resolvedPlace.latitude,
        resolvedPlace.longitude,
      ) > PLACE_SYNC_RADIUS_METERS
    ) {
      throw new MeetingException(MeetingErrorCode.placeOutsideRange)
    }

    const existing = await this.recommendationRepository.findOne({
      where: { meeting: { id: meetingId }, place: { id: request.placeId } },
    })
    if (existing) {
      throw new MeetingException(MeetingErrorCode.recommendationAlreadyExists)
    }

    let recommendation: MeetingPlaceRecommendation
    try {
      recommendation = await this.recommendationRepository.save(
        this.recommendationRepository.create({
          meeting: { id: meetingId } as Meeting,
          place,
          recommendedBy: participant,
        }),
      )
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new MeetingException(MeetingErrorCode.recommendationAlreadyExists)
      }
      throw error
    }

    return this.toRecommendationResponse(recommendation, resolvedPlace)
  }

  async getRecommendations(
    meetingId: string,
    accessToken: string,
  ): Promise<RecommendationPreviewDto[]> {
    const participant = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )

    const [recommendations, location] = await Promise.all([
      this.recommendationRepository.find({
        where: { meeting: { id: meetingId } },
        relations: { place: { category: true }, recommendedBy: true },
        order: { createdAt: 'ASC' },
      }),
      this.dataSource.getRepository(MeetingLocation).findOne({
        where: { meeting: { id: meetingId } },
      }),
    ])
    if (!location) {
      throw new MeetingException(MeetingErrorCode.locationNotFound)
    }
    const [resolved, preferences] = await Promise.all([
      this.placeLiveDataService.resolvePlaces(
        recommendations.map((recommendation) => recommendation.place),
        location,
      ),
      this.voteRepository.getPreferenceSummaries(
        recommendations.map((recommendation) => recommendation.id),
        participant.id,
      ),
    ])

    return recommendations.map((recommendation) => {
      const summary = preferences.get(recommendation.id)
      return this.toRecommendationResponse(
        recommendation,
        resolved.get(recommendation.place.id)!,
        summary,
      )
    })
  }

  async getMeetingStatus(
    meetingId: string,
    accessToken: string,
  ): Promise<MeetingStatusResponseDto> {
    const { meeting } = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )

    const confirmedCourseCandidateId = meeting.isConfirmed()
      ? await this.findConfirmedCourseCandidateId(meetingId)
      : null

    return { status: meeting.status, confirmedCourseCandidateId }
  }

  private async findConfirmedCourseCandidateId(
    meetingId: string,
  ): Promise<string> {
    const confirmed = await this.courseCandidateRepository.findOne({
      where: { meeting: { id: meetingId }, isSelected: true },
    })
    if (!confirmed) {
      throw new MeetingException(
        MeetingErrorCode.confirmedCourseCandidateNotFound,
      )
    }
    return confirmed.id
  }

  private async getMeetingScreen(
    meetingId: string,
    accessToken: string,
  ): Promise<MeetingScreenResponseDto> {
    const viewer = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    const meeting = await this.dataSource.getRepository(Meeting).findOne({
      where: { id: meetingId },
      relations: { meetingType: true, meetingLocation: true },
    })
    if (!meeting || !meeting.meetingLocation) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }

    const [participants, steps, recommendations] = await Promise.all([
      this.participantRepository.find({
        where: { meeting: { id: meetingId } },
        relations: { user: true },
        order: { createdAt: 'ASC' },
      }),
      this.dataSource.getRepository(CourseCategoryStep).find({
        where: { meeting: { id: meetingId } },
        relations: { category: true },
        order: { order: 'ASC' },
      }),
      this.recommendationRepository.find({
        where: { meeting: { id: meetingId } },
        relations: { place: { category: true }, recommendedBy: true },
        order: { createdAt: 'ASC' },
      }),
    ])

    const host = participants.find(
      (participant) => participant.role === ParticipantRole.Host,
    )
    if (!host?.user) {
      throw new CommonException(CommonErrorCode.internalServerError)
    }

    return {
      id: meeting.id,
      meetingId: meeting.id,
      invitationCode: meeting.accessToken,
      participantAccessToken: viewer.accessToken,
      invitationUrl: `${this.config.get('INVITATION_BASE_URL', { infer: true })}/${meeting.accessToken}`,
      name: meeting.name,
      date: meeting.date,
      time: meeting.time,
      courseImageUrl: meeting.courseImageKey
        ? this.mediaService.getPublicUrl(meeting.courseImageKey)
        : null,
      role: viewer.role === ParticipantRole.Host ? 'HOST' : 'MEMBER',
      isHost: viewer.role === ParticipantRole.Host,
      permissions: {
        canManageMeeting: viewer.role === ParticipantRole.Host,
        canSelectCourse: viewer.role === ParticipantRole.Host,
        canShareInvitation: viewer.role === ParticipantRole.Host,
      },
      meetingType: {
        id: meeting.meetingType.id,
        code: meeting.meetingType
          .code as MeetingScreenResponseDto['meetingTypeCode'],
        name: meeting.meetingType.name,
      },
      meetingTypeCode: meeting.meetingType
        .code as MeetingScreenResponseDto['meetingTypeCode'],
      host: {
        userKey: host.user.userKey,
        nickname: host.nickname,
        profileAvatarId: host.profileAvatarId,
      },
      categorySlugs: steps.map(
        (step) =>
          step.category
            .slug as MeetingScreenResponseDto['categorySlugs'][number],
      ),
      firstLocation: this.toMeetingLocationResponse(meeting.meetingLocation),
      viewerParticipantId: viewer.id,
      participants: participants.map((participant) => ({
        id: participant.id,
        nickname: participant.nickname,
        role:
          participant.role === ParticipantRole.Host
            ? ('HOST' as const)
            : ('MEMBER' as const),
        profileAvatarId: participant.profileAvatarId,
      })),
      categorySteps: steps.map((step) => ({
        id: step.id,
        name: step.category.name,
        slug: step.category
          .slug as MeetingScreenResponseDto['categorySlugs'][number],
        order: step.order,
      })),
      recommendations: await this.toRecommendationResponses(
        recommendations,
        meeting.meetingLocation,
        viewer.id,
      ),
      selectedCourse: null,
    }
  }

  private toCoursePlanResponse(
    meeting: Meeting,
    steps: CourseCategoryStep[],
  ): CoursePlanResponseDto {
    return {
      meetingId: meeting.id,
      maxSteps: MAX_COURSE_STEPS,
      version: meeting.courseVersion,
      categorySteps: steps.map((step) => ({
        id: step.category.id,
        name: step.category.name,
        slug: step.category
          .slug as CoursePlanResponseDto['categorySteps'][number]['slug'],
        order: step.order,
      })),
    }
  }

  private toInvitationResponse(meeting: Meeting): MeetingInvitationResponseDto {
    return {
      meetingId: meeting.id,
      invitationCode: meeting.accessToken,
      invitationUrl: `${this.config.get('INVITATION_BASE_URL', { infer: true })}/${meeting.accessToken}`,
      name: meeting.name,
      date: meeting.date,
      time: meeting.time,
      locationName: meeting.meetingLocation!.displayName,
    }
  }

  private normalizeInvitationCode(accessToken: string): string {
    const normalized = accessToken.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      throw new CommonException(CommonErrorCode.validationError, [
        {
          field: 'invitationCode',
          reason: '6자리 영문 대문자·숫자여야 합니다.',
        },
      ])
    }
    return normalized
  }

  private generateInvitationCode(): string {
    return Array.from({ length: 6 }, () =>
      INVITATION_CODE_ALPHABET.charAt(
        randomBytes(1)[0] % INVITATION_CODE_ALPHABET.length,
      ),
    ).join('')
  }

  private async findOrCreateUser(
    manager: EntityManager,
    userKey: string,
  ): Promise<User> {
    await manager.query(
      `INSERT INTO "user" ("user_key") VALUES ($1) ON CONFLICT ("user_key") DO NOTHING`,
      [userKey],
    )
    const user = await manager.getRepository(User).findOne({
      where: { userKey },
    })
    if (!user) {
      throw new CommonException(CommonErrorCode.internalServerError)
    }
    return user
  }

  private generateParticipantToken(): string {
    return randomBytes(32).toString('hex')
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false
    if (!('driverError' in error)) return false

    const driverError = error.driverError
    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === '23505'
    )
  }

  private assertCourseImageState(meeting: Meeting): void {
    if (meeting.status !== MeetingStatus.CourseConfirmed) {
      throw new MeetingException(MeetingErrorCode.courseImageStateInvalid)
    }
  }

  private toCourseImageResponse(meeting: Meeting): CourseImageResponseDto {
    if (!meeting.courseImageKey || !meeting.courseImageUploadedAt) {
      throw new CommonException(CommonErrorCode.internalServerError)
    }
    return {
      imageUrl: this.mediaService.getPublicUrl(meeting.courseImageKey),
      uploadedAt: meeting.courseImageUploadedAt,
    }
  }

  private async discardCourseImage(
    asset: Parameters<MediaService['discardStoredImage']>[0],
  ): Promise<void> {
    try {
      await this.mediaService.discardStoredImage(asset)
    } catch (error) {
      const detail = error instanceof Error ? error.stack : String(error)
      this.logger.error(
        `Failed to discard unreferenced course image: ${asset.objectKey}`,
        detail,
      )
    }
  }

  private toMeetingLocationResponse(
    location: MeetingLocation,
  ): MeetingLocationResponseDto {
    return {
      id: location.id,
      displayName: location.displayName,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      externalAddressId: location.externalAddressId,
      syncVersion: location.syncVersion,
    }
  }

  private toRecommendationResponse(
    recommendation: MeetingPlaceRecommendation,
    place: ResolvedPlace,
    preference: {
      likeCount: number
      dislikeCount: number
      myPreference: PreferenceType | null
    } = { likeCount: 0, dislikeCount: 0, myPreference: null },
  ): RecommendationPreviewDto {
    return {
      id: recommendation.id,
      categoryId: place.category.id,
      place: {
        id: place.id,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        source: place.source,
        providerPlaceId: place.providerPlaceId,
        placeUrl: place.placeUrl,
      },
      recommendedByParticipantId: recommendation.recommendedBy.id,
      likeCount: preference.likeCount,
      dislikeCount: preference.dislikeCount,
      viewerPreference: preference.myPreference,
    }
  }

  private async toRecommendationResponses(
    recommendations: MeetingPlaceRecommendation[],
    location: MeetingLocation,
    viewerId: string,
  ): Promise<RecommendationPreviewDto[]> {
    if (recommendations.length === 0) return []
    const [resolved, preferences] = await Promise.all([
      this.placeLiveDataService.resolvePlaces(
        recommendations.map((recommendation) => recommendation.place),
        location,
      ),
      this.voteRepository.getPreferenceSummaries(
        recommendations.map((recommendation) => recommendation.id),
        viewerId,
      ),
    ])
    return recommendations.map((recommendation) =>
      this.toRecommendationResponse(
        recommendation,
        resolved.get(recommendation.place.id)!,
        preferences.get(recommendation.id),
      ),
    )
  }

  private toMeetingScreenResponse(
    created: {
      meeting: Meeting
      location: MeetingLocation
      steps: CourseCategoryStep[]
      participant: MeetingParticipant
      user: User
    },
    request: CreateMeetingRequest,
  ): MeetingScreenResponseDto {
    return {
      id: created.meeting.id,
      meetingId: created.meeting.id,
      invitationCode: created.meeting.accessToken,
      participantAccessToken: created.participant.accessToken,
      invitationUrl: `${this.config.get('INVITATION_BASE_URL', { infer: true })}/${created.meeting.accessToken}`,
      name: created.meeting.name,
      date: created.meeting.date,
      time: created.meeting.time,
      courseImageUrl: null,
      role: 'HOST',
      isHost: true,
      permissions: {
        canManageMeeting: true,
        canSelectCourse: true,
        canShareInvitation: true,
      },
      meetingType: {
        id: created.meeting.meetingType.id,
        code: created.meeting.meetingType
          .code as MeetingScreenResponseDto['meetingTypeCode'],
        name: created.meeting.meetingType.name,
      },
      meetingTypeCode: request.meetingTypeCode,
      host: request.host,
      categorySlugs: request.categorySlugs,
      firstLocation: {
        id: created.location.id,
        displayName: created.location.displayName,
        address: created.location.address,
        latitude: created.location.latitude,
        longitude: created.location.longitude,
        externalAddressId: created.location.externalAddressId,
        syncVersion: created.location.syncVersion,
      },
      viewerParticipantId: created.participant.id,
      participants: [
        {
          id: created.participant.id,
          nickname: created.participant.nickname,
          role: 'HOST',
          profileAvatarId: created.participant.profileAvatarId,
        },
      ],
      categorySteps: created.steps.map((step) => ({
        id: step.id,
        name: step.category.name,
        slug: step.category
          .slug as MeetingScreenResponseDto['categorySlugs'][number],
        order: step.order,
      })),
      recommendations: [],
      selectedCourse: null,
    }
  }

  async getMapPins(
    meetingId: string,
    accessToken: string,
  ): Promise<MapPinsResponseDto> {
    const { meeting } = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    meeting.assertStatus(
      MAP_PINS_VISIBLE_STATUSES,
      MeetingErrorCode.mapPinsNotVisible,
    )

    const [meetingWithLocation, recommendations] = await Promise.all([
      this.meetingRepository.findOne({
        where: { id: meetingId },
        relations: { meetingLocation: true },
      }),
      this.recommendationRepository.find({
        where: { meeting: { id: meetingId } },
        relations: { place: { category: true } },
        order: { createdAt: 'ASC' },
      }),
    ])
    if (!meetingWithLocation) {
      throw new MeetingException(MeetingErrorCode.notFound)
    }
    meetingWithLocation.assertHasLocation()
    const resolved = await this.placeLiveDataService.resolvePlaces(
      recommendations.map((recommendation) => recommendation.place),
      meetingWithLocation.meetingLocation,
    )

    return {
      startPlace: this.toStartPlacePin(meetingWithLocation.meetingLocation),
      sharedPlaces: recommendations.map((recommendation) =>
        this.toPlacePin(resolved.get(recommendation.place.id)!),
      ),
    }
  }

  private toStartPlacePin(location: MeetingLocation): MapPinDto {
    return {
      name: location.displayName,
      longitude: location.longitude,
      latitude: location.latitude,
    }
  }

  private toPlacePin(place: ResolvedPlace): MapPinDto {
    return {
      placeId: place.id,
      name: place.name,
      category: place.category.name,
      categorySlug: place.category.slug as CategorySlug,
      longitude: place.longitude,
      latitude: place.latitude,
    }
  }

  async updatePlacePreference(
    meetingId: string,
    recommendationId: string,
    accessToken: string,
    preference: PreferenceType | null,
  ): Promise<PlacePreferenceResponseDto> {
    const participant = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    participant.meeting.assertStatus(
      PLACE_PREFERENCE_EDITABLE_STATUSES,
      MeetingErrorCode.placePreferenceNotEditable,
    )

    const recommendationExists = await this.recommendationRepository.exists({
      where: { id: recommendationId, meeting: { id: meetingId } },
    })
    if (!recommendationExists) {
      throw new MeetingException(MeetingErrorCode.recommendationNotFound)
    }

    const { likeCount, dislikeCount } =
      await this.voteRepository.applyPreference(
        recommendationId,
        participant.id,
        preference,
      )

    return { likeCount, dislikeCount, myPreference: preference }
  }

  async getSimilarPlaces(
    meetingId: string,
    placeId: string,
    accessToken: string,
    excludeIds: string[] | undefined,
    size: number,
  ): Promise<SimilarPlaceResponseDto[]> {
    const { meeting } = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    meeting.assertStatus(
      SIMILAR_PLACES_RECOMMENDABLE_STATUSES,
      MeetingErrorCode.similarPlacesNotRecommendable,
    )

    const [place, alreadyRecommended] = await Promise.all([
      this.placeRepository.findOne({
        where: { id: placeId },
        relations: { category: true },
      }),
      this.recommendationRepository.find({
        where: { meeting: { id: meetingId } },
        relations: { place: true },
        select: { place: { id: true } },
      }),
    ])
    if (!place) {
      throw new MeetingException(MeetingErrorCode.placeNotFound)
    }

    const limit = Math.min(size, MAX_SIMILAR_PLACES_SIZE)
    const displayedIds = excludeIds ?? []
    const recommendedPlaceIds = alreadyRecommended.map(
      (recommendation) => recommendation.place.id,
    )
    if (place.source === PlaceSource.Kakao) {
      const location = await this.dataSource
        .getRepository(MeetingLocation)
        .findOne({ where: { meeting: { id: meetingId } } })
      if (!location) {
        throw new MeetingException(MeetingErrorCode.locationNotFound)
      }
      const liveResult = await this.placeLiveDataService.searchKakao(location, [
        place.category,
      ])
      const excluded = new Set([
        placeId,
        ...displayedIds,
        ...recommendedPlaceIds,
      ])
      const nearbyCandidates = liveResult.places
        .filter((candidate) => !excluded.has(candidate.id))
        .slice(0, SIMILAR_PLACE_CANDIDATE_POOL_SIZE)
      const candidates = shuffle(nearbyCandidates).slice(0, limit)
      const previewPhotos =
        await this.placePhotoService.findPreviewPhotos(candidates)
      return candidates.map((candidate) => {
        const previewPhoto = previewPhotos.get(candidate.id) ?? null
        return {
          id: candidate.id,
          categoryId: candidate.category.id,
          name: candidate.name,
          address: candidate.address,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          primaryImageUrl: previewPhoto?.url ?? null,
          previewUrl: previewPhoto?.url ?? null,
          previewPhoto,
          placeUrl: candidate.placeUrl ?? null,
        }
      })
    }

    const similar = await this.placeSearchRepository.findSimilar(
      place.category.id,
      [placeId, ...displayedIds, ...recommendedPlaceIds],
      place.latitude,
      place.longitude,
      PLACE_SYNC_RADIUS_METERS,
      limit,
    )

    const padIds = displayedIds.slice(0, limit - similar.length)
    const padding =
      padIds.length > 0
        ? await this.placeRepository.find({
            where: { id: In(padIds) },
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              source: true,
              providerPlaceId: true,
              roadAddress: true,
              phone: true,
              placeUrl: true,
            },
          })
        : []

    const candidates = [...similar, ...padding]
    const previewPhotos =
      await this.placePhotoService.findPreviewPhotos(candidates)

    return candidates.map((candidate) => {
      const previewPhoto = previewPhotos.get(candidate.id) ?? null
      return {
        id: candidate.id,
        categoryId: place.category.id,
        name: candidate.name,
        address: candidate.address,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        primaryImageUrl: previewPhoto?.url ?? null,
        previewUrl: previewPhoto?.url ?? null,
        previewPhoto,
        placeUrl: candidate.placeUrl ?? null,
      }
    })
  }
}
