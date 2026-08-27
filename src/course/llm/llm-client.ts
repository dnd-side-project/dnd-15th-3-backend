import { Injectable } from '@nestjs/common'
import { APIError, OpenAI } from 'openai'

export type LlmProvider = 'nvidia' | 'openai'

export interface LlmClientOptions {
  provider: LlmProvider
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens?: number
}

export interface LlmClientMetadata {
  provider: LlmProvider
  model: string
  endpoint: string
  isConfigured: boolean
}

export interface LlmClientPort {
  readonly metadata: LlmClientMetadata
  chat(system: string, user: string): Promise<LlmChatResult>
  validateModel(): Promise<void>
  probeJson(): Promise<void>
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'LlmProviderError'
  }
}

export interface LlmChatResult {
  content: string
  model: string
}

const JSON_FORMAT_UNSUPPORTED_HINTS = [
  'response_format',
  'json_object',
  'unsupported_parameter',
  'not supported',
  'not support',
  'invalid_param',
  'invalid parameter',
  'unknown parameter',
]

const DEFAULT_MAX_TOKENS = 2048

export const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'

function isResponseFormatUnsupported(error: unknown): boolean {
  if (!(error instanceof APIError)) return false
  if (error.status === 400) {
    const message = `${error.code ?? ''} ${error.message}`.toLowerCase()
    return JSON_FORMAT_UNSUPPORTED_HINTS.some((hint) => message.includes(hint))
  }
  return false
}

@Injectable()
export class LlmClient implements LlmClientPort {
  private readonly client: OpenAI
  readonly metadata: LlmClientMetadata

  constructor(readonly options: LlmClientOptions) {
    this.metadata = {
      provider: options.provider,
      model: options.model,
      endpoint: options.baseUrl,
      isConfigured: options.apiKey.length > 0,
    }
    this.client = new OpenAI({
      apiKey: options.apiKey,
      // biome-ignore lint/style/useNamingConvention: openai SDK 필드명과 동일하게 유지
      baseURL: options.baseUrl,
      maxRetries: 2,
    })
  }

  chat(system: string, user: string): Promise<LlmChatResult> {
    return this.createChat({ system, user, withJsonFormat: true })
  }

  private async createChat(args: {
    system: string
    user: string
    withJsonFormat: boolean
  }): Promise<LlmChatResult> {
    const { system, user, withJsonFormat } = args

    try {
      const response = await this.client.chat.completions.create({
        model: this.options.model,
        temperature: this.options.temperature,
        // biome-ignore lint/style/useNamingConvention: OpenAI API field name.
        max_tokens: this.options.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(withJsonFormat
          ? {
              // biome-ignore lint/style/useNamingConvention: OpenAI API 필드명과 동일하게 유지
              response_format: { type: 'json_object' as const },
            }
          : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      })

      const content = response.choices[0]?.message?.content ?? ''
      return { content: stripCodeFence(content), model: response.model }
    } catch (error) {
      if (withJsonFormat && isResponseFormatUnsupported(error)) {
        return this.createChat({ system, user, withJsonFormat: false })
      }
      if (error instanceof APIError) {
        throw new LlmProviderError(
          `LLM 호출 실패: ${error.message}`,
          error.code ?? 'llm_provider_error',
          error.status,
        )
      }
      throw error
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list()
      return response.data.map((model) => model.id)
    } catch (error) {
      if (error instanceof APIError) {
        throw new LlmProviderError(
          `모델 목록 조회 실패: ${error.message}`,
          error.code ?? 'llm_model_list_error',
          error.status,
        )
      }
      throw error
    }
  }

  async validateModel(): Promise<void> {
    const models = await this.listModels()
    if (!models.includes(this.options.model)) {
      throw new LlmProviderError(
        `LLM 모델 '${this.options.model}'을(를) ${this.options.baseUrl}에서 찾을 수 없습니다.`,
        'llm_model_not_found',
      )
    }
  }

  async probeJson(): Promise<void> {
    await this.createChat({
      system: 'You are a JSON generator.',
      user: 'Return a JSON object containing a single key "ok" with value true.',
      withJsonFormat: true,
    })
  }
}

export function stripCodeFence(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```')) return trimmed
  const withoutOpening = trimmed.replace(/^```(?:json)?\s*/i, '')
  return withoutOpening.replace(/```\s*$/, '').trim()
}

export const LLM_CLIENT = Symbol('LLM_CLIENT')
