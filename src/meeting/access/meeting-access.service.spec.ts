import { NotFoundException, UnauthorizedException } from '@nestjs/common'
import { MeetingAccessService } from './meeting-access.service'

function createService() {
  const meetingRepository = { exists: jest.fn() }
  const participantRepository = { findOne: jest.fn() }
  const service = new MeetingAccessService(
    meetingRepository as never,
    participantRepository as never,
  )

  return { service, meetingRepository, participantRepository }
}

describe('MeetingAccessService', () => {
  describe('findParticipant', () => {
    it('accessToken이 빈 문자열이면 DB 조회 없이 401을 던진다', async () => {
      const { service, participantRepository } = createService()

      const promise = service.findParticipant('1', '')

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      await expect(promise).rejects.toThrow(
        '모임 참여자 토큰이 유효하지 않습니다.',
      )
      expect(participantRepository.findOne).not.toHaveBeenCalled()
    })

    it('accessToken이 공백 문자열이면 DB 조회 없이 401을 던진다', async () => {
      const { service, participantRepository } = createService()

      const promise = service.findParticipant('1', '   ')

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(participantRepository.findOne).not.toHaveBeenCalled()
    })

    it('참여자를 찾지 못했지만 모임은 존재하면 토큰 무효 401을 던진다', async () => {
      const { service, participantRepository, meetingRepository } =
        createService()
      participantRepository.findOne.mockResolvedValue(null)
      meetingRepository.exists.mockResolvedValue(true)

      const promise = service.findParticipant('1', 'bad-token')

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      await expect(promise).rejects.toThrow(
        '모임 참여자 토큰이 유효하지 않습니다.',
      )
      expect(participantRepository.findOne).toHaveBeenCalledWith({
        where: { meeting: { id: '1' }, accessToken: 'bad-token' },
        relations: { user: true, meeting: true },
      })
      expect(meetingRepository.exists).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })

    it('참여자를 찾지 못하고 모임도 존재하지 않으면 404를 던진다', async () => {
      const { service, participantRepository, meetingRepository } =
        createService()
      participantRepository.findOne.mockResolvedValue(null)
      meetingRepository.exists.mockResolvedValue(false)

      const promise = service.findParticipant('999', 'token')

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('모임을 찾을 수 없습니다.')
    })

    it('accessToken 앞뒤 공백을 제거하고 조회한다', async () => {
      const { service, participantRepository } = createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })

      await service.findParticipant('1', '  token  ')

      expect(participantRepository.findOne).toHaveBeenCalledWith({
        where: { meeting: { id: '1' }, accessToken: 'token' },
        relations: { user: true, meeting: true },
      })
    })

    it('참여자를 정상적으로 찾으면 모임 존재 여부를 별도로 확인하지 않는다', async () => {
      const { service, participantRepository, meetingRepository } =
        createService()
      participantRepository.findOne.mockResolvedValue({ id: 'participant-1' })

      await service.findParticipant('1', 'token')

      expect(meetingRepository.exists).not.toHaveBeenCalled()
    })

    it('참여자를 찾으면 그대로 반환한다', async () => {
      const { service, participantRepository } = createService()
      const participant = { id: 'participant-1' }
      participantRepository.findOne.mockResolvedValue(participant)

      await expect(service.findParticipant('1', 'token')).resolves.toBe(
        participant,
      )
    })
  })
})
