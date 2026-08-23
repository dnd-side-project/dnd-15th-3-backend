import { Injectable, Logger } from '@nestjs/common'
import { FallbackQuestionnaireGenerator } from './fallback-questionnaire.generator'
import { OpenAiQuestionnaireGenerator } from './openai-questionnaire.generator'
import type {
  QuestionnaireGenerationContext,
  QuestionnaireGenerationResult,
  QuestionnaireGenerator,
} from './questionnaire-generator'

@Injectable()
export class ResilientQuestionnaireGenerator implements QuestionnaireGenerator {
  private readonly logger = new Logger(ResilientQuestionnaireGenerator.name)

  constructor(
    private readonly openAiGenerator: OpenAiQuestionnaireGenerator,
    private readonly fallbackGenerator: FallbackQuestionnaireGenerator,
  ) {}

  async generate(
    context: QuestionnaireGenerationContext,
  ): Promise<QuestionnaireGenerationResult> {
    if (!this.openAiGenerator.isConfigured()) {
      return this.fallbackGenerator.generate(context)
    }

    try {
      return await this.openAiGenerator.generate(context)
    } catch (error) {
      this.logger.warn(
        '외부 LLM 질문 생성에 실패해 기본 질문을 사용합니다.',
        error instanceof Error ? error.message : String(error),
      )
      return this.fallbackGenerator.generate(context)
    }
  }
}
