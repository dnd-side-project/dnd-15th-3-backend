import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MeetingAccessModule } from 'src/meeting/access/meeting-access.module'
import { PlaceImage } from 'src/place/entities/place-image.entity'
import { StorageModule } from 'src/storage/storage.module'
import { CourseController } from './course.controller'
import { CourseService } from './course.service'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidateComment } from './entities/course-candidate-comment.entity'
import { MeetingPlaceRecommendationRepository } from './meeting-place-recommendation.repository'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'

@Module({
  imports: [
    MeetingAccessModule,
    StorageModule,
    TypeOrmModule.forFeature([
      CourseCandidate,
      CourseCandidateComment,
      PlaceImage,
    ]),
  ],
  controllers: [CourseController],
  providers: [
    MeetingPlaceRecommendationVoteRepository,
    MeetingPlaceRecommendationRepository,
    CourseService,
  ],
  exports: [MeetingPlaceRecommendationVoteRepository],
})
export class CourseModule {}
