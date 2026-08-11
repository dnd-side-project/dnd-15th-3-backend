import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MeetingAccessModule } from 'src/meeting/access/meeting-access.module'
import { CourseController } from './course.controller'
import { CourseService } from './course.service'
import { CourseCandidate } from './entities/course-candidate.entity'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'

@Module({
  imports: [MeetingAccessModule, TypeOrmModule.forFeature([CourseCandidate])],
  controllers: [CourseController],
  providers: [MeetingPlaceRecommendationVoteRepository, CourseService],
  exports: [MeetingPlaceRecommendationVoteRepository],
})
export class CourseModule {}
