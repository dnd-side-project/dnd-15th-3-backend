import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KakaoModule } from 'src/kakao/kakao.module'
import { MeetingAccessModule } from 'src/meeting/access/meeting-access.module'
import { OutboxModule } from 'src/outbox/outbox.module'
import { PlaceModule } from 'src/place/place.module'
import { QuestionnaireModule } from 'src/questionnaire/questionnaire.module'
import { CourseController } from './course.controller'
import { CourseRepository } from './course.repository'
import { CourseService } from './course.service'
import { CourseGenerationProcessor } from './course-generation.processor'
import { CourseGenerationService } from './course-generation.service'
import { COURSE_CANDIDATE_GENERATOR } from './course-generation.tokens'
import { CourseGenerationWorker } from './course-generation.worker'
import { CourseGenerationRouteService } from './course-generation-route.service'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidateComment } from './entities/course-candidate-comment.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseGenerationQuestionnaireAnswer } from './entities/course-generation-questionnaire-answer.entity'
import { CourseGenerationRun } from './entities/course-generation-run.entity'
import { MeetingPlaceRecommendationRepository } from './meeting-place-recommendation.repository'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'
import { DeterministicCourseCandidateGenerator } from './provider/deterministic-course-candidate.generator'

@Module({
  imports: [
    MeetingAccessModule,
    PlaceModule,
    KakaoModule,
    OutboxModule,
    QuestionnaireModule,
    TypeOrmModule.forFeature([
      CourseCandidate,
      CourseCandidateComment,
      CourseCandidatePlace,
      CourseGenerationRun,
      CourseGenerationQuestionnaireAnswer,
    ]),
  ],
  controllers: [CourseController],
  providers: [
    MeetingPlaceRecommendationVoteRepository,
    MeetingPlaceRecommendationRepository,
    CourseRepository,
    DeterministicCourseCandidateGenerator,
    {
      provide: COURSE_CANDIDATE_GENERATOR,
      useExisting: DeterministicCourseCandidateGenerator,
    },
    CourseGenerationRouteService,
    CourseGenerationProcessor,
    CourseGenerationService,
    CourseGenerationWorker,
    CourseService,
  ],
  exports: [MeetingPlaceRecommendationVoteRepository, CourseGenerationWorker],
})
export class CourseModule {}
