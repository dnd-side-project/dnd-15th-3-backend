import { Module } from '@nestjs/common'
import { CourseController } from './course.controller'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'

@Module({
  controllers: [CourseController],
  providers: [MeetingPlaceRecommendationVoteRepository],
  exports: [MeetingPlaceRecommendationVoteRepository],
})
export class CourseModule {}
