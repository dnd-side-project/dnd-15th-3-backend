import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingQuestion } from './entities/meeting-question.entity'
import { MeetingQuestionOption } from './entities/meeting-question-option.entity'
import { MeetingQuestionnaire } from './entities/meeting-questionnaire.entity'
import { FallbackQuestionnaireGenerator } from './provider/fallback-questionnaire.generator'
import { OpenAiQuestionnaireGenerator } from './provider/openai-questionnaire.generator'
import { ResilientQuestionnaireGenerator } from './provider/resilient-questionnaire.generator'
import { QuestionnaireController } from './questionnaire.controller'
import { QuestionnaireService } from './questionnaire.service'
import { QUESTIONNAIRE_GENERATOR } from './questionnaire.tokens'
import { QuestionnaireGenerationProcessor } from './questionnaire-generation.processor'
import { QuestionnaireGenerationWorker } from './questionnaire-generation.worker'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseCategoryStep,
      MeetingPlaceRecommendation,
      Meeting,
      MeetingParticipant,
      MeetingQuestionnaire,
      MeetingQuestion,
      MeetingQuestionOption,
    ]),
  ],
  controllers: [QuestionnaireController],
  providers: [
    FallbackQuestionnaireGenerator,
    OpenAiQuestionnaireGenerator,
    ResilientQuestionnaireGenerator,
    {
      provide: QUESTIONNAIRE_GENERATOR,
      useExisting: ResilientQuestionnaireGenerator,
    },
    QuestionnaireGenerationProcessor,
    QuestionnaireGenerationWorker,
    QuestionnaireService,
  ],
  exports: [QuestionnaireGenerationWorker, QuestionnaireService, TypeOrmModule],
})
export class QuestionnaireModule {}
