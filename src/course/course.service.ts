import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MeetingAccessService } from 'src/meeting/access/meeting-access.service'
import { assertMeetingStatus } from 'src/meeting/access/meeting-access.utils'
import {
  COURSE_CANDIDATES_VISIBLE_STATUSES,
  COURSE_COMMENTS_VISIBLE_STATUSES,
} from 'src/meeting/constants/meeting-status.constants'
import { Repository } from 'typeorm'
import { CourseCandidateListResponseDto } from './dto/course-candidate-list-response.dto'
import { CourseCommentDto } from './dto/course-comment.dto'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidateComment } from './entities/course-candidate-comment.entity'

@Injectable()
export class CourseService {
  constructor(
    private readonly meetingAccessService: MeetingAccessService,
    @InjectRepository(CourseCandidate)
    private readonly courseCandidateRepository: Repository<CourseCandidate>,
    @InjectRepository(CourseCandidateComment)
    private readonly commentRepository: Repository<CourseCandidateComment>,
  ) {}

  async getCourseCandidates(
    meetingId: string,
    accessToken: string,
  ): Promise<CourseCandidateListResponseDto> {
    const { meeting } = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    assertMeetingStatus(
      meeting.status,
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

  async getCourseComments(
    meetingId: string,
    courseCandidateId: string,
    accessToken: string,
  ): Promise<CourseCommentDto[]> {
    const viewer = await this.meetingAccessService.findParticipant(
      meetingId,
      accessToken,
    )
    assertMeetingStatus(
      viewer.meeting.status,
      COURSE_COMMENTS_VISIBLE_STATUSES,
      '모임이 코스 생성 완료 상태가 아니어서 코스 댓글 목록을 조회할 수 없습니다.',
    )

    const courseCandidateExists = await this.courseCandidateRepository.exists({
      where: { id: courseCandidateId, meeting: { id: meetingId } },
    })
    if (!courseCandidateExists) {
      throw new NotFoundException('코스 후보를 찾을 수 없습니다.')
    }

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
      isMine: comment.participant.id === viewer.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    }))
  }
}
