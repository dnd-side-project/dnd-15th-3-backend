import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KakaoModule } from 'src/kakao/kakao.module'
import { MeetingAccessModule } from 'src/meeting/access/meeting-access.module'
import { PlaceModule } from 'src/place/place.module'
import { CourseController } from './course.controller'
import { CourseRepository } from './course.repository'
import { CourseService } from './course.service'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidateComment } from './entities/course-candidate-comment.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { MeetingPlaceRecommendationRepository } from './meeting-place-recommendation.repository'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'

@Module({
  imports: [
    MeetingAccessModule,
    PlaceModule,
    KakaoModule,
    TypeOrmModule.forFeature([
      CourseCandidate,
      CourseCandidateComment,
      CourseCandidatePlace,
    ]),
  ],
  controllers: [CourseController],
  providers: [
    MeetingPlaceRecommendationVoteRepository,
    MeetingPlaceRecommendationRepository,
    CourseRepository,
    CourseService,
  ],
  exports: [MeetingPlaceRecommendationVoteRepository],
})
export class CourseModule {}
