import { Module } from '@nestjs/common'
import { HostGuard } from 'src/common/guards/host.guard'
import { ParticipantAccessTokenGuard } from 'src/common/guards/participant-access-token.guard'
import {
  MeetingController,
  MeetingDetailController,
} from './meeting.controller'

@Module({
  controllers: [MeetingController, MeetingDetailController],
  providers: [ParticipantAccessTokenGuard, HostGuard],
})
export class MeetingModule {}
