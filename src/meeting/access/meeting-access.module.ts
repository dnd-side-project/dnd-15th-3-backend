import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Meeting } from '../entities/meeting.entity'
import { MeetingParticipant } from '../entities/meeting-participant.entity'
import { MeetingAccessService } from './meeting-access.service'

@Module({
  imports: [TypeOrmModule.forFeature([Meeting, MeetingParticipant])],
  providers: [MeetingAccessService],
  exports: [MeetingAccessService],
})
export class MeetingAccessModule {}
