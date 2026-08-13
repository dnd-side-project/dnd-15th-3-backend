import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { CourseModule } from 'src/course/course.module'
import { CourseCandidate } from 'src/course/entities/course-candidate.entity'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { Place } from 'src/place/entities/place.entity'
import { PlaceImage } from 'src/place/entities/place-image.entity'
import { PlaceModule } from 'src/place/place.module'
import { StorageModule } from 'src/storage/storage.module'
import { User } from 'src/user/entities/user.entity'
import { MeetingAccessModule } from './access/meeting-access.module'
import { Meeting } from './entities/meeting.entity'
import { MeetingLocation } from './entities/meeting-location.entity'
import { MeetingParticipant } from './entities/meeting-participant.entity'
import { MeetingType } from './entities/meeting-type.entity'
import {
  MeetingController,
  MeetingDetailController,
} from './meeting.controller'
import { MeetingService } from './meeting.service'

@Module({
  imports: [
    PlaceModule,
    CourseModule,
    MeetingAccessModule,
    StorageModule,
    TypeOrmModule.forFeature([
      Category,
      CourseCandidate,
      CourseCategoryStep,
      Meeting,
      MeetingLocation,
      MeetingParticipant,
      MeetingType,
      MeetingPlaceRecommendation,
      Place,
      PlaceImage,
      User,
    ]),
  ],
  controllers: [MeetingController, MeetingDetailController],
  providers: [MeetingService],
  exports: [MeetingService],
})
export class MeetingModule {}
