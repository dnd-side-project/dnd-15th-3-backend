import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Meeting } from '../entities/meeting.entity'
import { MeetingParticipant } from '../entities/meeting-participant.entity'
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
  ): Promise<MeetingParticipant> {
    assertAccessToken(accessToken)
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
}
