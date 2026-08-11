import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MeetingAccessService } from 'src/meeting/access/meeting-access.service'
import { assertMeetingStatus } from 'src/meeting/access/meeting-access.utils'
import { COURSE_CANDIDATES_VISIBLE_STATUSES } from 'src/meeting/constants/meeting-status.constants'
import { Repository } from 'typeorm'
import { CourseCandidateListResponseDto } from './dto/course-candidate-list-response.dto'
import { CourseCandidate } from './entities/course-candidate.entity'

@Injectable()
export class CourseService {
  constructor(
    private readonly meetingAccessService: MeetingAccessService,
    @InjectRepository(CourseCandidate)
    private readonly courseCandidateRepository: Repository<CourseCandidate>,
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
}
