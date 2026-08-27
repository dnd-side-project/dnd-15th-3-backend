import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { type EntityManager, Repository } from 'typeorm'
import { Meeting } from '../entities/meeting.entity'
import { MeetingParticipant } from '../entities/meeting-participant.entity'
import { MeetingException } from '../exception/meeting.exception'
import { MeetingErrorCode } from '../exception/meeting-error-code'
import { assertAccessToken } from './meeting-access.utils'

@Injectable()
export class MeetingAccessService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
  ) {}

  async findParticipant(
    meetingId: string,
    accessToken: string,
    manager?: EntityManager,
  ): Promise<MeetingParticipant> {
    assertAccessToken(accessToken)
    const participantRepository = manager
      ? manager.getRepository(MeetingParticipant)
      : this.participantRepository
    const meetingRepository = manager
      ? manager.getRepository(Meeting)
      : this.meetingRepository

    const participant = await participantRepository.findOne({
      where: {
        meeting: { id: meetingId },
        accessToken: accessToken.trim(),
      },
      relations: { user: true, meeting: true },
    })
    if (!participant) {
      const meetingExists = await meetingRepository.exists({
        where: { id: meetingId },
      })
      if (!meetingExists) {
        throw new MeetingException(MeetingErrorCode.notFound)
      }
      throw new CommonException(CommonErrorCode.authenticationFailed)
    }
    return participant
  }
}
