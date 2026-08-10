import { randomBytes } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { Category } from 'src/category/entities/category.entity'
import { type Env } from 'src/config/env'
import { CourseCandidate } from 'src/course/entities/course-candidate.entity'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { Place } from 'src/place/entities/place.entity'
import { PlaceSyncJob } from 'src/place/entities/place-sync-job.entity'
import { PlaceSyncJobStatus } from 'src/place/enums/place-sync-job-status.enum'
import {
  haversineDistanceMeters,
  PLACE_SYNC_RADIUS_METERS,
} from 'src/place/sync/place-sync.constants'
import { PlaceSyncService } from 'src/place/sync/place-sync.service'
import { User } from 'src/user/entities/user.entity'
import { DataSource, type EntityManager, In, Repository } from 'typeorm'
import { CoursePlanResponseDto } from './dto/course-plan-response.dto'
import { MeetingInvitationResponseDto } from './dto/meeting-invitation-response.dto'
import { MeetingLocationResponseDto } from './dto/meeting-location.dto'
import { MeetingScreenResponseDto } from './dto/meeting-screen-response.dto'
import { MeetingStatusResponseDto } from './dto/meeting-status-response.dto'
import { RecommendationPreviewDto } from './dto/recommendation-preview.dto'
import { Meeting } from './entities/meeting.entity'
import { MeetingLocation } from './entities/meeting-location.entity'
import { MeetingParticipant } from './entities/meeting-participant.entity'
import { MeetingType } from './entities/meeting-type.entity'
import { MeetingStatus } from './enums/meeting-status.enum'
import { ParticipantRole } from './enums/participant-role.enum'
import type {
  CreateMeetingRequest,
  InvitationPreviewRequest,
  JoinMeetingRequest,
  MeetingLocationInput,
  UpdateCoursePlanRequest,
} from './schema/meeting-request.schema'
import type { AddRecommendationRequest } from './schema/recommendation-request.schema'

const INVITATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

@Injectable()
export class MeetingService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly dataSource: DataSource,
    private readonly placeSyncService: PlaceSyncService,
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

    throw new ServiceUnavailableException('초대 코드를 발급하지 못했습니다.')
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
        throw new NotFoundException('모임 유형을 찾을 수 없습니다.')
      }

      const categories = await categoryRepository.find({
        where: { slug: In(request.categorySlugs) },
      })
      if (categories.length !== new Set(request.categorySlugs).size) {
        throw new BadRequestException(
          '존재하지 않는 코스 카테고리가 포함되어 있습니다.',
        )
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

      await this.placeSyncService.createJobs(
        manager,
        meeting,
        location,
        categories,
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
      throw new NotFoundException('유효한 초대 코드를 찾을 수 없습니다.')
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
          throw new NotFoundException('유효한 초대 코드를 찾을 수 없습니다.')
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
            throw new ConflictException('이미 사용 중인 닉네임입니다.')
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
            throw new ConflictException('이미 사용 중인 닉네임입니다.')
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
              throw new ConflictException('이미 사용 중인 닉네임입니다.')
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
        throw new ConflictException('이미 사용 중인 닉네임입니다.')
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

  async getCoursePlan(
    meetingId: string,
    accessToken: string,
  ): Promise<CoursePlanResponseDto> {
    await this.findParticipant(meetingId, accessToken)

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
      throw new NotFoundException('모임을 찾을 수 없습니다.')
    }

    return this.toCoursePlanResponse(meeting, steps)
  }

  async updateCoursePlan(
    meetingId: string,
    accessToken: string,
    request: UpdateCoursePlanRequest,
  ): Promise<CoursePlanResponseDto> {
    this.assertAccessToken(accessToken)
    const normalizedAccessToken = accessToken.trim()

    const result = await this.dataSource.transaction(async (manager) => {
      const participantRepository = manager.getRepository(MeetingParticipant)
      const participant = await participantRepository.findOne({
        where: {
          meeting: { id: meetingId },
          accessToken: normalizedAccessToken,
        },
      })
      if (!participant) {
        throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
      }
      if (participant.role !== ParticipantRole.Host) {
        throw new ForbiddenException('방장만 코스 계획을 수정할 수 있습니다.')
      }

      const categoryRepository = manager.getRepository(Category)
      const categories = await categoryRepository.find({
        where: { slug: In(request.categorySlugs) },
      })
      if (categories.length !== new Set(request.categorySlugs).size) {
        throw new BadRequestException(
          '존재하지 않는 코스 카테고리가 포함되어 있습니다.',
        )
      }

      const meetingRepository = manager.getRepository(Meeting)
      const meeting = await meetingRepository
        .createQueryBuilder('meeting')
        .where('meeting.id = :meetingId', { meetingId })
        .setLock('pessimistic_write')
        .getOne()
      if (!meeting) {
        throw new NotFoundException('모임을 찾을 수 없습니다.')
      }
      if (meeting.courseVersion !== request.version) {
        throw new ConflictException(
          '오래된 코스 계획입니다. 최신 계획을 다시 조회하세요.',
        )
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
    this.assertAccessToken(accessToken)
    const normalizedAccessToken = accessToken.trim()

    return this.dataSource.transaction(async (manager) => {
      const participantRepository = manager.getRepository(MeetingParticipant)
      const participant = await participantRepository.findOne({
        where: {
          meeting: { id: meetingId },
          accessToken: normalizedAccessToken,
        },
      })
      if (!participant) {
        throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
      }
      if (participant.role !== ParticipantRole.Host) {
        throw new ForbiddenException(
          '방장만 첫 만남 위치를 변경할 수 있습니다.',
        )
      }

      const locationRepository = manager.getRepository(MeetingLocation)
      const location = await locationRepository
        .createQueryBuilder('location')
        .leftJoinAndSelect('location.meeting', 'meeting')
        .where('location.meeting_id = :meetingId', { meetingId })
        .setLock('pessimistic_write')
        .getOne()
      if (!location) {
        throw new NotFoundException('모임 기준 위치를 찾을 수 없습니다.')
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

      const meeting = location.meeting
      const steps = await manager.getRepository(CourseCategoryStep).find({
        where: { meeting: { id: meetingId } },
        relations: { category: true },
      })
      await this.placeSyncService.createJobs(
        manager,
        meeting,
        updated,
        steps.map((step) => step.category),
      )

      return this.toMeetingLocationResponse(updated)
    })
  }

  async addRecommendation(
    meetingId: string,
    accessToken: string,
    request: AddRecommendationRequest,
  ): Promise<RecommendationPreviewDto> {
    this.assertAccessToken(accessToken)
    const normalizedAccessToken = accessToken.trim()
    const participant = await this.participantRepository.findOne({
      where: { meeting: { id: meetingId }, accessToken: normalizedAccessToken },
    })
    if (!participant) {
      throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
    }

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
      throw new NotFoundException('모임 기준 위치를 찾을 수 없습니다.')
    }
    if (!place) {
      throw new NotFoundException('장소를 찾을 수 없습니다.')
    }

    const categoryStep = await this.dataSource
      .getRepository(CourseCategoryStep)
      .findOne({
        where: {
          meeting: { id: meetingId },
          category: { id: place.category.id },
        },
      })
    if (!categoryStep) {
      throw new BadRequestException(
        '현재 모임에서 선택한 코스 카테고리의 장소만 추가할 수 있습니다.',
      )
    }

    if (
      haversineDistanceMeters(
        location.latitude,
        location.longitude,
        place.latitude,
        place.longitude,
      ) > PLACE_SYNC_RADIUS_METERS
    ) {
      throw new BadRequestException(
        '모임 기준 위치에서 2km 이내의 장소만 추가할 수 있습니다.',
      )
    }

    const existing = await this.recommendationRepository.findOne({
      where: { meeting: { id: meetingId }, place: { id: request.placeId } },
    })
    if (existing) {
      throw new ConflictException('이미 모임에 추가된 장소입니다.')
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
        throw new ConflictException('이미 모임에 추가된 장소입니다.')
      }
      throw error
    }

    return this.toRecommendationResponse(recommendation)
  }

  async getRecommendations(
    meetingId: string,
    accessToken: string,
  ): Promise<RecommendationPreviewDto[]> {
    this.assertAccessToken(accessToken)
    const normalizedAccessToken = accessToken.trim()
    const participant = await this.participantRepository.findOne({
      where: { meeting: { id: meetingId }, accessToken: normalizedAccessToken },
    })
    if (!participant) {
      throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
    }

    const recommendations = await this.recommendationRepository.find({
      where: { meeting: { id: meetingId } },
      relations: { place: { category: true }, recommendedBy: true },
      order: { createdAt: 'ASC' },
    })

    return recommendations.map((recommendation) =>
      this.toRecommendationResponse(recommendation),
    )
  }

  async getMeetingStatus(
    meetingId: string,
    accessToken: string,
  ): Promise<MeetingStatusResponseDto> {
    const { meeting } = await this.findParticipant(meetingId, accessToken)

    const confirmedCourseCandidateId =
      meeting.status === MeetingStatus.CourseConfirmed
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
      throw new InternalServerErrorException(
        '확정된 모임인데 선택된 코스 후보를 찾을 수 없습니다.',
      )
    }
    return confirmed.id
  }

  private async findParticipant(
    meetingId: string,
    accessToken: string,
  ): Promise<MeetingParticipant> {
    this.assertAccessToken(accessToken)
    const participant = await this.participantRepository.findOne({
      where: {
        meeting: { id: meetingId },
        accessToken: accessToken.trim(),
      },
      relations: { user: true, meeting: true },
    })
    if (!participant) {
      const meetingExists = await this.meetingRepository.exists({
        where: { id: meetingId },
      })
      if (!meetingExists) {
        throw new NotFoundException('모임을 찾을 수 없습니다.')
      }
      throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
    }
    return participant
  }

  private async getMeetingScreen(
    meetingId: string,
    accessToken: string,
  ): Promise<MeetingScreenResponseDto> {
    const viewer = await this.findParticipant(meetingId, accessToken)
    const meeting = await this.dataSource.getRepository(Meeting).findOne({
      where: { id: meetingId },
      relations: { meetingType: true, meetingLocation: true },
    })
    if (!meeting || !meeting.meetingLocation) {
      throw new NotFoundException('모임을 찾을 수 없습니다.')
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
      throw new NotFoundException('모임 방장 정보를 찾을 수 없습니다.')
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
      recommendations: recommendations.map((recommendation) =>
        this.toRecommendationResponse(recommendation),
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
      locationId: meeting.meetingLocation!.id,
    }
  }

  private normalizeInvitationCode(accessToken: string): string {
    const normalized = accessToken.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      throw new BadRequestException(
        '초대 코드는 6자리 영문 대문자·숫자여야 합니다.',
      )
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
    if (!user) throw new Error('사용자 생성 후 사용자를 조회하지 못했습니다.')
    return user
  }

  private generateParticipantToken(): string {
    return randomBytes(32).toString('hex')
  }

  private assertAccessToken(accessToken: string): void {
    if (!accessToken?.trim()) {
      throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
    }
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
  ): RecommendationPreviewDto {
    return {
      id: recommendation.id,
      categoryId: recommendation.place.category.id,
      place: {
        id: recommendation.place.id,
        name: recommendation.place.name,
        address: recommendation.place.address,
        latitude: recommendation.place.latitude,
        longitude: recommendation.place.longitude,
      },
      recommendedByParticipantId: recommendation.recommendedBy.id,
      likeCount: 0,
      dislikeCount: 0,
      viewerPreference: null,
    }
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
}
