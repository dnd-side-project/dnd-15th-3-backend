import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingAccessService } from 'src/meeting/access/meeting-access.service'
import { assertAccessToken } from 'src/meeting/access/meeting-access.utils'
import {
  COURSE_CANDIDATES_VISIBLE_STATUSES,
  COURSE_COMMENT_CREATABLE_STATUSES,
  COURSE_COMMENTS_VISIBLE_STATUSES,
  COURSE_DETAIL_VISIBLE_STATUSES,
} from 'src/meeting/constants/meeting-status.constants'
import { MeetingPlaceRecommendationDto } from 'src/meeting/dto/meeting-place-recommendation.dto'
import { MeetingStatusResponseDto } from 'src/meeting/dto/meeting-status-response.dto'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { PlaceImage } from 'src/place/entities/place-image.entity'
import { StorageService } from 'src/storage/storage.service'
import { DataSource, In, Repository } from 'typeorm'
import { ConfirmCourseRequestDto } from './dto/confirm-course-request.dto'
import { CourseCandidateListResponseDto } from './dto/course-candidate-list-response.dto'
import { CourseCommentDto } from './dto/course-comment.dto'
import { CourseDetailResponseDto } from './dto/course-detail-response.dto'
import { CreateCourseCommentRequestDto } from './dto/create-course-comment-request.dto'
import { CreateCourseCommentResponseDto } from './dto/create-course-comment-response.dto'
import { ExcludedPlaceListResponseDto } from './dto/excluded-place-list-response.dto'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidateComment } from './entities/course-candidate-comment.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { MeetingPlaceRecommendationRepository } from './meeting-place-recommendation.repository'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'
import {
  metersToKilometers,
  secondsToMinutes,
} from './utils/course-route.utils'

@Injectable()
export class CourseService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly meetingAccessService: MeetingAccessService,
    private readonly voteRepository: MeetingPlaceRecommendationVoteRepository,
    private readonly recommendationRepository: MeetingPlaceRecommendationRepository,
    private readonly storageService: StorageService,
    @InjectRepository(CourseCandidate)
    private readonly courseCandidateRepository: Repository<CourseCandidate>,
    @InjectRepository(CourseCandidateComment)
    private readonly commentRepository: Repository<CourseCandidateComment>,
    @InjectRepository(CourseCandidatePlace)
    private readonly courseCandidatePlaceRepository: Repository<CourseCandidatePlace>,
    @InjectRepository(PlaceImage)
    private readonly placeImageRepository: Repository<PlaceImage>,
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
      '모임이 코스 생성 완료 상태가 아니어서 코스 후보 목록을 조회할 수 없습니다.',
    )

    const candidates = await this.courseCandidateRepository.find({
      where: { meeting: { id: meetingId } },
      order: { order: 'ASC' },
    })
    if (candidates.length === 0) {
      throw new InternalServerErrorException(
        '코스 생성이 완료된 모임인데 코스 후보를 찾을 수 없는 데이터 정합성 오류입니다.',
      )
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
      '모임이 코스 생성 완료 상태도 확정 상태도 아니어서 코스 상세를 조회할 수 없습니다.',
    )

    const candidate = await this.courseCandidateRepository.findOne({
      where: { id: courseCandidateId, meeting: { id: meetingId } },
    })
    if (!candidate) {
      throw new NotFoundException('코스 후보를 찾을 수 없습니다.')
    }

    const steps = await this.courseCandidatePlaceRepository.find({
      where: { courseCandidate: { id: courseCandidateId } },
      relations: {
        meetingPlaceRecommendation: { place: { category: true } },
      },
      order: { order: 'ASC' },
    })

    const primaryImageUrls = await this.findPrimaryImageUrls(
      steps.map((step) => step.meetingPlaceRecommendation.place.id),
    )

    const totalDistanceMeters = steps.reduce(
      (sum, step) => sum + (step.distanceToNextMeters ?? 0),
      0,
    )

    return {
      courseName: candidate.name,
      totalDistanceKm: metersToKilometers(totalDistanceMeters),
      totalCount: steps.length,
      route: steps.map((step) => {
        const place = step.meetingPlaceRecommendation.place
        return {
          recommendationId: step.meetingPlaceRecommendation.id,
          placeId: place.id,
          order: step.order,
          name: place.name,
          category: place.category.name,
          categorySlug: place.category.slug as CategorySlug,
          address: place.address,
          primaryImageUrl: primaryImageUrls.get(place.id) ?? null,
          longitude: place.longitude,
          latitude: place.latitude,
          walkDurationToNextMin: secondsToMinutes(step.travelTimeToNext),
        }
      }),
    }
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
      '모임이 코스 생성 완료 상태가 아니어서 코스 댓글 목록을 조회할 수 없습니다.',
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
      '모임이 코스 생성 완료 상태가 아니어서 댓글을 작성할 수 없습니다.',
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
    request: ConfirmCourseRequestDto,
  ): Promise<MeetingStatusResponseDto> {
    assertAccessToken(accessToken)
    const normalizedAccessToken = accessToken.trim()

    return await this.dataSource.transaction(async (manager) => {
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
      participant.assertHost('방장만 코스를 확정할 수 있습니다.')

      const meetingRepository = manager.getRepository(Meeting)
      const meeting = await meetingRepository
        .createQueryBuilder('meeting')
        .where('meeting.id = :meetingId', { meetingId })
        .setLock('pessimistic_write')
        .getOne()
      if (!meeting) {
        throw new NotFoundException('모임을 찾을 수 없습니다.')
      }
      meeting.confirm()

      const candidateRepository = manager.getRepository(CourseCandidate)
      const candidate = await candidateRepository.findOne({
        where: { id: courseCandidateId, meeting: { id: meetingId } },
      })
      if (!candidate) {
        throw new NotFoundException('코스 후보를 찾을 수 없습니다.')
      }
      candidate.select()

      if (request.courseImageKey) {
        meeting.setCourseImage(request.courseImageKey)
      }

      await candidateRepository.save(candidate)
      await meetingRepository.save(meeting)

      return {
        status: meeting.status,
        confirmedCourseCandidateId: candidate.id,
      }
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
      '모임이 코스 생성 완료 상태가 아니어서 제외된 장소 목록을 조회할 수 없습니다.',
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

    const [preferenceSummaries, primaryImageUrls] = await Promise.all([
      this.voteRepository.getPreferenceSummaries(recommendationIds, viewer.id),
      this.findPrimaryImageUrls(
        recommendations.map((recommendation) => recommendation.place.id),
      ),
    ])

    const items: MeetingPlaceRecommendationDto[] = recommendations.map(
      (recommendation) => {
        const summary = preferenceSummaries.get(recommendation.id)
        return {
          recommendationId: recommendation.id,
          category: recommendation.place.category.name,
          categorySlug: recommendation.place.category.slug as CategorySlug,
          name: recommendation.place.name,
          address: recommendation.place.address,
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

  private async findPrimaryImageUrls(
    placeIds: string[],
  ): Promise<Map<string, string>> {
    if (placeIds.length === 0) {
      return new Map()
    }

    const images = await this.placeImageRepository.find({
      where: { place: { id: In(placeIds) }, isPrimary: true },
      relations: { place: true, mediaAsset: true },
      select: { place: { id: true }, mediaAsset: { objectKey: true } },
    })
    const urls = await Promise.all(
      images.map((image) =>
        this.storageService.getPresignedDownloadUrl(image.mediaAsset.objectKey),
      ),
    )
    return new Map(images.map((image, index) => [image.place.id, urls[index]]))
  }

  private async assertCourseCandidateExists(
    courseCandidateId: string,
    meetingId: string,
  ): Promise<void> {
    const exists = await this.courseCandidateRepository.exists({
      where: { id: courseCandidateId, meeting: { id: meetingId } },
    })
    if (!exists) {
      throw new NotFoundException('코스 후보를 찾을 수 없습니다.')
    }
  }
}
