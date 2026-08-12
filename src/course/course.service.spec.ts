import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { CourseService } from './course.service'
import { CourseCandidate } from './entities/course-candidate.entity'

function createService() {
  const dataSource = { transaction: jest.fn() }
  const meetingAccessService = { findParticipant: jest.fn() }
  const courseCandidateRepository = { find: jest.fn(), exists: jest.fn() }
  const commentRepository = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  }
  const service = new CourseService(
    dataSource as never,
    meetingAccessService as never,
    courseCandidateRepository as never,
    commentRepository as never,
  )

  return {
    service,
    dataSource,
    meetingAccessService,
    courseCandidateRepository,
    commentRepository,
  }
}

function createConfirmTransactionMocks() {
  const participantRepository = { findOne: jest.fn() }
  const meetingQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  }
  const meetingRepository = {
    createQueryBuilder: jest.fn(() => meetingQueryBuilder),
    save: jest.fn().mockImplementation((value) => value),
  }
  const candidateRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((value) => value),
  }
  const repositories = new Map<unknown, unknown>([
    [MeetingParticipant, participantRepository],
    [Meeting, meetingRepository],
    [CourseCandidate, candidateRepository],
  ])
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  }

  return {
    manager,
    participantRepository,
    meetingQueryBuilder,
    meetingRepository,
    candidateRepository,
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

  describe('createCourseComment', () => {
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

      const promise = service.createCourseComment('1', '2', 'bad-token', {
        content: '좋아요!',
      })

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(commentRepository.save).not.toHaveBeenCalled()
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

      const promise = service.createCourseComment('1', '2', 'token', {
        content: '좋아요!',
      })

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(commentRepository.save).not.toHaveBeenCalled()
    })

    it('코스 후보가 해당 모임 소속이 아니면 404를 던지고 댓글을 저장하지 않는다', async () => {
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

      const promise = service.createCourseComment('1', '2', 'token', {
        content: '좋아요!',
      })

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(courseCandidateRepository.exists).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
      expect(commentRepository.save).not.toHaveBeenCalled()
    })

    it('검증을 통과하면 댓글을 저장하고 생성된 정보를 반환한다', async () => {
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
      commentRepository.save.mockResolvedValue({
        id: 'comment-1',
        content: '여기 코스 좋아요!',
        createdAt: new Date('2026-08-08T12:34:56.000Z'),
      })

      await expect(
        service.createCourseComment('1', '2', 'token', {
          content: '여기 코스 좋아요!',
        }),
      ).resolves.toEqual({
        commentId: 'comment-1',
        content: '여기 코스 좋아요!',
        createdAt: '2026-08-08T12:34:56.000Z',
      })
      expect(commentRepository.create).toHaveBeenCalledWith({
        courseCandidate: { id: '2' },
        participant: { id: 'viewer-1' },
        content: '여기 코스 좋아요!',
      })
      expect(commentRepository.save).toHaveBeenCalledWith({
        courseCandidate: { id: '2' },
        participant: { id: 'viewer-1' },
        content: '여기 코스 좋아요!',
      })
    })
  })

  describe('confirmCourse', () => {
    it('accessToken이 빈 문자열이면 트랜잭션 없이 401을 던진다', async () => {
      const { service, dataSource } = createService()

      const promise = service.confirmCourse('1', '2', '', {})

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('참여자를 찾지 못하면 401을 던지고 아무것도 변경하지 않는다', async () => {
      const { service, dataSource } = createService()
      const { manager, participantRepository, candidateRepository } =
        createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(null)

      const promise = service.confirmCourse('1', '2', 'token', {})

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(candidateRepository.save).not.toHaveBeenCalled()
    })

    it('참여자가 방장이 아니면 403을 던지고 아무것도 변경하지 않는다', async () => {
      const { service, dataSource } = createService()
      const { manager, participantRepository, candidateRepository } =
        createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue({
        role: ParticipantRole.Member,
      })

      const promise = service.confirmCourse('1', '2', 'token', {})

      await expect(promise).rejects.toBeInstanceOf(ForbiddenException)
      await expect(promise).rejects.toThrow('방장만 코스를 확정할 수 있습니다.')
      expect(candidateRepository.save).not.toHaveBeenCalled()
    })

    it('모임을 찾지 못하면 404를 던지고 후보를 조회하지 않는다', async () => {
      const { service, dataSource } = createService()
      const {
        manager,
        participantRepository,
        meetingQueryBuilder,
        candidateRepository,
      } = createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue({
        role: ParticipantRole.Host,
      })
      meetingQueryBuilder.getOne.mockResolvedValue(null)

      const promise = service.confirmCourse('1', '2', 'token', {})

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('모임을 찾을 수 없습니다.')
      expect(candidateRepository.findOne).not.toHaveBeenCalled()
      expect(candidateRepository.save).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])(
      '모임이 %s 상태이면 409를 던지고 후보를 조회하지 않는다',
      async (status) => {
        const { service, dataSource } = createService()
        const {
          manager,
          participantRepository,
          meetingQueryBuilder,
          candidateRepository,
        } = createConfirmTransactionMocks()
        dataSource.transaction.mockImplementation((callback: never) =>
          (callback as (manager: unknown) => unknown)(manager),
        )
        participantRepository.findOne.mockResolvedValue({
          role: ParticipantRole.Host,
        })
        meetingQueryBuilder.getOne.mockResolvedValue({ status })

        const promise = service.confirmCourse('1', '2', 'token', {})

        await expect(promise).rejects.toBeInstanceOf(ConflictException)
        expect(candidateRepository.findOne).not.toHaveBeenCalled()
      },
    )

    it('코스 후보가 해당 모임 소속이 아니면 404를 던진다', async () => {
      const { service, dataSource } = createService()
      const {
        manager,
        participantRepository,
        meetingQueryBuilder,
        candidateRepository,
      } = createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue({
        role: ParticipantRole.Host,
      })
      meetingQueryBuilder.getOne.mockResolvedValue({
        status: MeetingStatus.CourseGenerated,
      })
      candidateRepository.findOne.mockResolvedValue(null)

      const promise = service.confirmCourse('1', '2', 'token', {})

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
    })

    it('검증을 통과하면 코스 후보를 확정하고 모임 상태를 전환한다', async () => {
      const { service, dataSource } = createService()
      const {
        manager,
        participantRepository,
        meetingQueryBuilder,
        meetingRepository,
        candidateRepository,
      } = createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue({
        role: ParticipantRole.Host,
      })
      const meeting = { status: MeetingStatus.CourseGenerated }
      meetingQueryBuilder.getOne.mockResolvedValue(meeting)
      const candidate = { id: '2', isSelected: false }
      candidateRepository.findOne.mockResolvedValue(candidate)

      await expect(
        service.confirmCourse('1', '2', 'token', {}),
      ).resolves.toEqual({
        status: MeetingStatus.CourseConfirmed,
        confirmedCourseCandidateId: '2',
      })
      expect(participantRepository.findOne).toHaveBeenCalledWith({
        where: { meeting: { id: '1' }, accessToken: 'token' },
      })
      expect(meetingQueryBuilder.where).toHaveBeenCalledWith(
        'meeting.id = :meetingId',
        { meetingId: '1' },
      )
      expect(meetingQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      )
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
      expect(candidateRepository.save).toHaveBeenCalledWith({
        id: '2',
        isSelected: true,
      })
      expect(meetingRepository.save).toHaveBeenCalledWith({
        status: MeetingStatus.CourseConfirmed,
      })
      expect(meeting).not.toHaveProperty('courseImageKey')
    })

    it('courseImageKey가 있으면 모임에 반영하고 업로드 시각을 기록한다', async () => {
      const { service, dataSource } = createService()
      const {
        manager,
        participantRepository,
        meetingQueryBuilder,
        meetingRepository,
        candidateRepository,
      } = createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue({
        role: ParticipantRole.Host,
      })
      meetingQueryBuilder.getOne.mockResolvedValue({
        status: MeetingStatus.CourseGenerated,
      })
      candidateRepository.findOne.mockResolvedValue({
        id: '2',
        isSelected: false,
      })

      await service.confirmCourse('1', '2', 'token', {
        courseImageKey: 'course-cards/1/5.png',
      })

      expect(meetingRepository.save).toHaveBeenCalledWith({
        status: MeetingStatus.CourseConfirmed,
        courseImageKey: 'course-cards/1/5.png',
        courseImageUploadedAt: expect.any(Date),
      })
    })
  })
})
