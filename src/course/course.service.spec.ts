import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { CourseService } from './course.service'

function createService() {
  const meetingAccessService = { findParticipant: jest.fn() }
  const courseCandidateRepository = { find: jest.fn() }
  const service = new CourseService(
    meetingAccessService as never,
    courseCandidateRepository as never,
  )

  return { service, meetingAccessService, courseCandidateRepository }
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
})
