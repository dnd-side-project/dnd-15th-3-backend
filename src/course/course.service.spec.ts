import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { CourseService } from './course.service'

function createService() {
  const meetingAccessService = { findParticipant: jest.fn() }
  const courseCandidateRepository = { find: jest.fn(), exists: jest.fn() }
  const commentRepository = { find: jest.fn() }
  const service = new CourseService(
    meetingAccessService as never,
    courseCandidateRepository as never,
    commentRepository as never,
  )

  return {
    service,
    meetingAccessService,
    courseCandidateRepository,
    commentRepository,
  }
}

describe('CourseService', () => {
  describe('getCourseCandidates', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.'),
      )

      const promise = service.getCourseCandidates('1', 'bad-token')

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(courseCandidateRepository.find).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])('%s 상태에서는 DB 조회 없이 409를 던진다', async (status) => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: { status },
      })

      const promise = service.getCourseCandidates('1', 'token')

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      expect(courseCandidateRepository.find).not.toHaveBeenCalled()
    })

    it('코스 생성 완료 상태면 후보 목록을 순서대로 반환한다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: { status: MeetingStatus.CourseGenerated },
      })
      courseCandidateRepository.find.mockResolvedValue([
        { id: 'candidate-1', order: 1 },
        { id: 'candidate-2', order: 2 },
      ])

      await expect(service.getCourseCandidates('1', 'token')).resolves.toEqual({
        courseCandidates: [
          { courseCandidateId: 'candidate-1', order: 1 },
          { courseCandidateId: 'candidate-2', order: 2 },
        ],
        totalCount: 2,
      })
      expect(courseCandidateRepository.find).toHaveBeenCalledWith({
        where: { meeting: { id: '1' } },
        order: { order: 'ASC' },
      })
    })

    it('코스 생성 완료 상태인데 후보가 없으면 데이터 정합성 오류로 500을 던진다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: { status: MeetingStatus.CourseGenerated },
      })
      courseCandidateRepository.find.mockResolvedValue([])

      const promise = service.getCourseCandidates('1', 'token')

      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException)
      await expect(promise).rejects.toThrow(
        '코스 생성이 완료된 모임인데 코스 후보를 찾을 수 없는 데이터 정합성 오류입니다.',
      )
    })
  })

  describe('getCourseComments', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.'),
      )

      const promise = service.getCourseComments('1', '2', 'bad-token')

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(commentRepository.find).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])('%s 상태에서는 DB 조회 없이 409를 던진다', async (status) => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'viewer-1',
        meeting: { status },
      })

      const promise = service.getCourseComments('1', '2', 'token')

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(commentRepository.find).not.toHaveBeenCalled()
    })

    it('코스 후보가 해당 모임 소속이 아니면 404를 던지고 댓글을 조회하지 않는다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'viewer-1',
        meeting: { status: MeetingStatus.CourseGenerated },
      })
      courseCandidateRepository.exists.mockResolvedValue(false)

      const promise = service.getCourseComments('1', '2', 'token')

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(courseCandidateRepository.exists).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
      expect(commentRepository.find).not.toHaveBeenCalled()
    })

    it('코스 생성 완료 상태면 댓글을 작성 순서대로 반환하고 내 댓글 여부를 표시한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'viewer-1',
        meeting: { status: MeetingStatus.CourseGenerated },
      })
      courseCandidateRepository.exists.mockResolvedValue(true)
      commentRepository.find.mockResolvedValue([
        {
          id: 'comment-1',
          content: '여기 코스 좋아요!',
          createdAt: new Date('2026-08-08T12:34:56.000Z'),
          participant: {
            id: 'viewer-1',
            nickname: '모모',
            profileAvatarId: ProfileAvatarId.MomoBlue,
            role: ParticipantRole.Host,
          },
        },
        {
          id: 'comment-2',
          content: '저도요',
          createdAt: new Date('2026-08-08T13:00:00.000Z'),
          participant: {
            id: 'participant-2',
            nickname: '지니',
            profileAvatarId: ProfileAvatarId.MomoYellow,
            role: ParticipantRole.Member,
          },
        },
      ])

      await expect(
        service.getCourseComments('1', '2', 'token'),
      ).resolves.toEqual([
        {
          commentId: 'comment-1',
          nickname: '모모',
          profileAvatarId: ProfileAvatarId.MomoBlue,
          authorRole: ParticipantRole.Host,
          isMine: true,
          content: '여기 코스 좋아요!',
          createdAt: '2026-08-08T12:34:56.000Z',
        },
        {
          commentId: 'comment-2',
          nickname: '지니',
          profileAvatarId: ProfileAvatarId.MomoYellow,
          authorRole: ParticipantRole.Member,
          isMine: false,
          content: '저도요',
          createdAt: '2026-08-08T13:00:00.000Z',
        },
      ])
      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { courseCandidate: { id: '2' } },
        relations: { participant: true },
        order: { createdAt: 'ASC' },
      })
    })

    it('댓글이 하나도 없으면 빈 배열을 반환한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'viewer-1',
        meeting: { status: MeetingStatus.CourseGenerated },
      })
      courseCandidateRepository.exists.mockResolvedValue(true)
      commentRepository.find.mockResolvedValue([])

      await expect(
        service.getCourseComments('1', '2', 'token'),
      ).resolves.toEqual([])
    })
  })
})
