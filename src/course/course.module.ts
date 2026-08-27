import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { Env } from 'src/config/env'
import { KakaoModule } from 'src/kakao/kakao.module'
import { MeetingAccessModule } from 'src/meeting/access/meeting-access.module'
import { OutboxModule } from 'src/outbox/outbox.module'
import { PlaceModule } from 'src/place/place.module'
import { QuestionnaireModule } from 'src/questionnaire/questionnaire.module'
import { PlaceTagModule } from 'src/statistics/place-tag.module'
import { CourseController } from './course.controller'
import { CourseRepository } from './course.repository'
import { CourseService } from './course.service'
import { CourseGenerationProcessor } from './course-generation.processor'
import { CourseGenerationService } from './course-generation.service'
import { COURSE_CANDIDATE_GENERATOR } from './course-generation.tokens'
import { CourseGenerationInputSnapshotBuilder } from './course-generation-input-snapshot.builder'
import { CourseGenerationRouteService } from './course-generation-route.service'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidateComment } from './entities/course-candidate-comment.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseGenerationQuestionnaireAnswer } from './entities/course-generation-questionnaire-answer.entity'
import { CourseGenerationRun } from './entities/course-generation-run.entity'
import { CourseGeneratorService } from './llm/course-generator.service'
import { CourseGeneratorInputBuilder } from './llm/input/course-generator-input.builder'
import { LLM_CLIENT, LlmClient, OPENAI_API_BASE_URL } from './llm/llm-client'
import { LlmProviderValidator } from './llm/llm-provider.validator'
import { MeetingPlaceRecommendationRepository } from './meeting-place-recommendation.repository'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'
import { DeterministicCourseCandidateGenerator } from './provider/deterministic-course-candidate.generator'
import { LlmCourseCandidateGenerator } from './provider/llm-course-candidate.generator'
import { ResilientCourseCandidateGenerator } from './provider/resilient-course-candidate.generator'

@Module({
  imports: [
    ConfigModule,
    MeetingAccessModule,
    PlaceModule,
    KakaoModule,
    OutboxModule,
    QuestionnaireModule,
    PlaceTagModule,
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
    LlmCourseCandidateGenerator,
    ResilientCourseCandidateGenerator,
    {
      provide: COURSE_CANDIDATE_GENERATOR,
      useExisting: ResilientCourseCandidateGenerator,
    },
    CourseGenerationRouteService,
    CourseGenerationInputSnapshotBuilder,
    CourseGenerationProcessor,
    CourseGenerationService,
    CourseService,
    {
      provide: LLM_CLIENT,
      useFactory: (config: ConfigService<Env, true>) =>
        new LlmClient({
          provider: 'openai',
          apiKey: config.get('OPENAI_API_KEY', { infer: true }),
          baseUrl: OPENAI_API_BASE_URL,
          model: config.get('OPENAI_MODEL', { infer: true }),
          temperature: config.get('LLM_TEMPERATURE', { infer: true }),
          maxTokens: config.get('LLM_MAX_TOKENS', { infer: true }),
        }),
      inject: [ConfigService],
    },
    CourseGeneratorService,
    CourseGeneratorInputBuilder,
    LlmProviderValidator,
  ],
  exports: [MeetingPlaceRecommendationVoteRepository],
})
export class CourseModule {}
