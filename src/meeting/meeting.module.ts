import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Meeting } from './entities/meeting.entity'
import {
  MeetingController,
  MeetingDetailController,
} from './meeting.controller'
import { MeetingService } from './meeting.service'

@Module({
  imports: [TypeOrmModule.forFeature([Meeting])],
  controllers: [MeetingController, MeetingDetailController],
  providers: [MeetingService],
})
export class MeetingModule {}
