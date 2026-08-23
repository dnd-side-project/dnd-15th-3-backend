import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { Env } from 'src/config/env'
import { KakaoModule } from 'src/kakao/kakao.module'
import { MeetingAccessModule } from 'src/meeting/access/meeting-access.module'
import { OutboxModule } from 'src/outbox/outbox.module'
import { PlaceModule } from 'src/place/place.module'
import { CourseController } from './course.controller'
import { CourseRepository } from './course.repository'
import { CourseService } from './course.service'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidateComment } from './entities/course-candidate-comment.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseGeneratorService } from './llm/course-generator.service'
import { CourseGeneratorInputBuilder } from './llm/input/course-generator-input.builder'
import { LLM_CLIENT, LlmClient, OPENAI_API_BASE_URL } from './llm/llm-client'
import { LlmProviderValidator } from './llm/llm-provider.validator'
import { MeetingPlaceRecommendationRepository } from './meeting-place-recommendation.repository'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'

@Module({
  imports: [
    ConfigModule,
    MeetingAccessModule,
    PlaceModule,
    KakaoModule,
    OutboxModule,
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
