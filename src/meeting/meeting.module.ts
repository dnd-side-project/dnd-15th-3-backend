import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { CourseModule } from 'src/course/course.module'
import { CourseCandidate } from 'src/course/entities/course-candidate.entity'
import { CourseCandidatePlace } from 'src/course/entities/course-candidate-place.entity'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { MediaModule } from 'src/media/media.module'
import { Place } from 'src/place/entities/place.entity'
import { PlaceModule } from 'src/place/place.module'
import { QuestionnaireModule } from 'src/questionnaire/questionnaire.module'
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
    MediaModule,
    PlaceModule,
    CourseModule,
    QuestionnaireModule,
    MeetingAccessModule,
    TypeOrmModule.forFeature([
      Category,
      CourseCandidate,
      CourseCandidatePlace,
      CourseCategoryStep,
      Meeting,
      MeetingLocation,
      MeetingParticipant,
      MeetingType,
      MeetingPlaceRecommendation,
      Place,
      User,
    ]),
  ],
  controllers: [MeetingController, MeetingDetailController],
  providers: [MeetingService],
  exports: [MeetingService],
})
export class MeetingModule {}
