import { Injectable } from '@nestjs/common'
import { APIError, OpenAI } from 'openai'

export interface LlmClientOptions {
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens?: number
}

export interface CloudflareLlmClientOptions {
  accountId: string
  apiToken: string
  model: string
  temperature: number
  maxTokens?: number
}

export type LlmProvider = 'nvidia' | 'cloudflare'

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
      provider: 'nvidia',
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

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getCloudflareResponse(payload: unknown): string | undefined {
  if (!isRecord(payload) || payload.success !== true) return undefined
  if (!isRecord(payload.result)) return undefined
  return typeof payload.result.response === 'string'
    ? payload.result.response
    : undefined
}

function getCloudflareErrorMessage(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.errors)) {
    return 'Cloudflare API 응답이 올바르지 않습니다.'
  }

  const messages = payload.errors
    .filter(isRecord)
    .map((error) => (typeof error.message === 'string' ? error.message : ''))
    .filter((message) => message.length > 0)

  return messages.length > 0
    ? messages.join('; ')
    : 'Cloudflare API 호출에 실패했습니다.'
}

@Injectable()
export class CloudflareLlmClient implements LlmClientPort {
  private readonly fetcher: typeof fetch
  readonly metadata: LlmClientMetadata

  constructor(
    readonly options: CloudflareLlmClientOptions,
    fetcher: typeof fetch = globalThis.fetch,
  ) {
    this.fetcher = fetcher
    this.metadata = {
      provider: 'cloudflare',
      model: options.model,
      endpoint: this.getEndpoint(),
      isConfigured: options.accountId.length > 0 && options.apiToken.length > 0,
    }
  }

  async chat(system: string, user: string): Promise<LlmChatResult> {
    if (!this.metadata.isConfigured) {
      throw new LlmProviderError(
        'Cloudflare LLM 설정이 비어 있습니다.',
        'cloudflare_not_configured',
      )
    }

    const response = await this.fetcher(this.getEndpoint(), {
      headers: {
        // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
        Authorization: `Bearer ${this.options.apiToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: this.options.temperature,
        // biome-ignore lint/style/useNamingConvention: Cloudflare API field name.
        max_tokens: this.options.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
    })

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new LlmProviderError(
        'Cloudflare API 응답을 JSON으로 읽을 수 없습니다.',
        'cloudflare_invalid_response',
        response.status,
      )
    }

    if (!response.ok || !isRecord(payload) || payload.success !== true) {
      throw new LlmProviderError(
        `Cloudflare LLM 호출 실패: ${getCloudflareErrorMessage(payload)}`,
        'cloudflare_api_error',
        response.status,
      )
    }

    const content = getCloudflareResponse(payload)
    if (!content) {
      throw new LlmProviderError(
        'Cloudflare API 응답에 생성된 텍스트가 없습니다.',
        'cloudflare_invalid_response',
        response.status,
      )
    }

    return { content: stripCodeFence(content), model: this.options.model }
  }

  // Cloudflare validates the model through the run endpoint itself.
  validateModel(): Promise<void> {
    return Promise.resolve()
  }

  async probeJson(): Promise<void> {
    await this.chat(
      'You are a JSON generator.',
      'Return a JSON object containing a single key "ok" with value true.',
    )
  }

  private getEndpoint(): string {
    return `${CLOUDFLARE_API_BASE_URL}/accounts/${encodeURIComponent(this.options.accountId)}/ai/run/${this.options.model}`
  }
}

export function stripCodeFence(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```')) return trimmed
  const withoutOpening = trimmed.replace(/^```(?:json)?\s*/i, '')
  return withoutOpening.replace(/```\s*$/, '').trim()
}

export const LLM_CLIENT = Symbol('LLM_CLIENT')
