import { Module } from '@nestjs/common'
import {
  MeetingController,
  MeetingDetailController,
} from './meeting.controller'

@Module({ controllers: [MeetingController, MeetingDetailController] })
export class MeetingModule {}
