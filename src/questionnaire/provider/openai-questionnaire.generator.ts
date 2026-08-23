import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MetricsService } from 'src/common/observability/metrics.service'
import type { Env } from 'src/config/env'
import { z } from 'zod'
import { QuestionnaireSource } from '../enums/questionnaire-source.enum'
import {
  QUESTIONNAIRE_FOLLOW_UP_DIMENSION_CODES,
  QUESTIONNAIRE_GENERATED_QUESTION_COUNT,
  QUESTIONNAIRE_OPTION_COUNT,
  QUESTIONNAIRE_OPTION_LABEL_MAX_LENGTH,
  QUESTIONNAIRE_OPTION_LABEL_MIN_LENGTH,
  QUESTIONNAIRE_QUESTION_TEXT_MAX_LENGTH,
  QUESTIONNAIRE_QUESTION_TEXT_MIN_LENGTH,
  QuestionnaireOptionCode,
} from '../questionnaire.constants'
import { generatedFollowUpQuestionnaireSchema } from '../schema/generated-questionnaire.schema'
import { buildQuestionnaireGenerationPrompt } from './questionnaire-generation.prompt'
import type {
  QuestionnaireGenerationContext,
  QuestionnaireGenerationResult,
  QuestionnaireGenerator,
} from './questionnaire-generator'

const openAiResponseSchema = z
  .object({
    model: z.string().optional(),
    status: z.string().optional(),
    // biome-ignore lint/style/useNamingConvention: OpenAI API 필드명과 동일하게 유지
    incomplete_details: z
      .object({ reason: z.string().optional() })
      .passthrough()
      .nullable()
      .optional(),
    output: z.array(
      z
        .object({
          content: z
            .array(
              z
                .object({
                  type: z.string(),
                  text: z.string().optional(),
                  refusal: z.string().optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough()

const QUESTIONNAIRE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      minItems: QUESTIONNAIRE_GENERATED_QUESTION_COUNT,
      maxItems: QUESTIONNAIRE_GENERATED_QUESTION_COUNT,
      items: {
        type: 'object',
        properties: {
          dimensionCode: {
            type: 'string',
            enum: QUESTIONNAIRE_FOLLOW_UP_DIMENSION_CODES,
          },
          text: {
            type: 'string',
            description:
              '모임 맥락을 자연스럽게 반영하고 물음표로 끝나는 한국어 질문',
            minLength: QUESTIONNAIRE_QUESTION_TEXT_MIN_LENGTH,
            maxLength: QUESTIONNAIRE_QUESTION_TEXT_MAX_LENGTH,
          },
          options: {
            type: 'array',
            minItems: QUESTIONNAIRE_OPTION_COUNT,
            maxItems: QUESTIONNAIRE_OPTION_COUNT,
            items: {
              type: 'object',
              properties: {
                semanticCode: {
                  type: 'string',
                  enum: Object.values(QuestionnaireOptionCode),
                },
                emoji: { type: 'string', minLength: 1, maxLength: 16 },
                label: {
                  type: 'string',
                  description:
                    '코스 생성 규칙으로 바로 쓸 수 있는 구체적인 한국어 선택지',
                  minLength: QUESTIONNAIRE_OPTION_LABEL_MIN_LENGTH,
                  maxLength: QUESTIONNAIRE_OPTION_LABEL_MAX_LENGTH,
                },
              },
              required: ['semanticCode', 'emoji', 'label'],
              additionalProperties: false,
            },
          },
        },
        required: ['dimensionCode', 'text', 'options'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const

@Injectable()
export class OpenAiQuestionnaireGenerator implements QuestionnaireGenerator {
  constructor(
    private readonly config: ConfigService<Env, true>,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get('OPENAI_API_KEY', { infer: true }) &&
        this.config.get('OPENAI_MODEL', { infer: true }),
    )
  }

  generate(
    context: QuestionnaireGenerationContext,
  ): Promise<QuestionnaireGenerationResult> {
    if (!this.metrics) return this.generateWithOpenAi(context)

    return this.metrics.observeExternal(
      'openai',
      'questionnaire_generation',
      () => this.generateWithOpenAi(context),
    )
  }

  private async generateWithOpenAi(
    context: QuestionnaireGenerationContext,
  ): Promise<QuestionnaireGenerationResult> {
    const apiKey = this.config.get('OPENAI_API_KEY', { infer: true })
    const configuredModel = this.config.get('OPENAI_MODEL', { infer: true })
    if (!apiKey || !configuredModel) {
      throw new Error('OpenAI questionnaire generator is not configured')
    }

    const baseUrl = this.config
      .get('OPENAI_BASE_URL', { infer: true })
      .replace(/\/$/, '')
    const timeoutMs = this.config.get('OPENAI_TIMEOUT_MS', { infer: true })
    const prompt = buildQuestionnaireGenerationPrompt(context)
    const response = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: configuredModel,
        // biome-ignore lint/style/useNamingConvention: OpenAI API 필드명과 동일하게 유지
        max_output_tokens: 2000,
        temperature: 0.4,
        instructions: prompt.instructions,
        input: prompt.input,
        text: {
          format: {
            type: 'json_schema',
            name: 'meeting_questionnaire_follow_ups',
            strict: true,
            schema: QUESTIONNAIRE_JSON_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      throw new Error(
        `OpenAI questionnaire request failed with status ${response.status}`,
      )
    }

    const parsedResponse = openAiResponseSchema.parse(await response.json())
    if (parsedResponse.status === 'incomplete') {
      throw new Error(
        `OpenAI questionnaire response was incomplete: ${parsedResponse.incomplete_details?.reason ?? 'unknown'}`,
      )
    }
    const refusal = parsedResponse.output
      .flatMap((output) => output.content ?? [])
      .find((content) => content.type === 'refusal' && content.refusal)?.refusal
    if (refusal) {
      throw new Error('OpenAI questionnaire response was refused')
    }
    const outputText = parsedResponse.output
      .flatMap((output) => output.content ?? [])
      .find((content) => content.type === 'output_text' && content.text)?.text
    if (!outputText) {
      throw new Error(
        'OpenAI questionnaire response did not contain output_text',
      )
    }

    const questionnaire = generatedFollowUpQuestionnaireSchema.parse(
      JSON.parse(outputText),
    )
    return {
      questions: questionnaire.questions,
      source: QuestionnaireSource.Llm,
      provider: 'openai',
      model: parsedResponse.model ?? configuredModel,
    }
  }
}
