import { APIError, OpenAI } from 'openai'
import { LlmClient, LlmProviderError, stripCodeFence } from './llm-client'

jest.mock('openai', () => {
  const createMock = jest.fn()
  const listMock = jest.fn()

  class MockCompletions {
    create = createMock
  }

  class MockModels {
    list = listMock
  }

  class MockOpenAi {
    chat = { completions: new MockCompletions() }
    models = new MockModels()
    constructor(public options: unknown) {}
  }

  class MockApiError extends Error {
    code?: string
    status?: number
    constructor(message: string, code?: string, status?: number) {
      super(message)
      this.name = 'APIError'
      this.code = code
      this.status = status
    }
  }

  return {
    // biome-ignore lint/style/useNamingConvention: openai 모듈 export 이름과 동일하게 유지
    OpenAI: MockOpenAi,
    // biome-ignore lint/style/useNamingConvention: openai 모듈 export 이름과 동일하게 유지
    APIError: MockApiError,
    __mockCreate: createMock,
    __mockList: listMock,
  }
})

interface MockedOpenAiModule {
  // biome-ignore lint/style/useNamingConvention: openai 모듈 export 이름과 동일하게 유지
  OpenAI: typeof OpenAI
  // biome-ignore lint/style/useNamingConvention: openai 모듈 export 이름과 동일하게 유지
  APIError: new (
    message: string,
    code?: string,
    status?: number,
  ) => Error & { code?: string; status?: number }
  __mockCreate: jest.Mock
  __mockList: jest.Mock
}

const mockedModule = jest.requireMock('openai') as MockedOpenAiModule
const mockCreate = mockedModule.__mockCreate
const mockList = mockedModule.__mockList

function apiError(message: string, code?: string, status?: number): Error {
  return new mockedModule.APIError(message, code, status)
}

const baseOptions = {
  provider: 'nvidia' as const,
  apiKey: 'test-key',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3-ultra-550b-a55b',
  temperature: 0.2,
}

describe('LlmClient', () => {
  let client: LlmClient

  beforeEach(() => {
    jest.clearAllMocks()
    client = new LlmClient(baseOptions)
  })

  describe('metadata', () => {
    it('reflects the configured provider instead of a hardcoded value', () => {
      expect(client.metadata.provider).toBe('nvidia')

      const openaiClient = new LlmClient({ ...baseOptions, provider: 'openai' })
      expect(openaiClient.metadata.provider).toBe('openai')
    })
  })

  describe('chat', () => {
    it('converts LLM chat output content with stripCodeFence', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '```json\n{"routes":[]}\n```' } }],
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
      })

      const result = await client.chat('system prompt', 'user prompt')
      expect(result.content).toBe('{"routes":[]}')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: baseOptions.model,
          temperature: 0.2,
          // biome-ignore lint/style/useNamingConvention: OpenAI API 필드명과 동일하게 유지
          response_format: { type: 'json_object' },
        }),
      )
    })

    it('falls back to no response_format when provider rejects it with 400', async () => {
      const err = apiError(
        'response_format parameter is not supported',
        'unsupported_parameter',
        400,
      )

      mockCreate.mockRejectedValueOnce(err).mockResolvedValueOnce({
        choices: [{ message: { content: '{"ok":true}' } }],
        model: baseOptions.model,
      })

      const result = await client.chat('system', 'user')
      expect(result.content).toBe('{"ok":true}')
      expect(mockCreate).toHaveBeenCalledTimes(2)
      expect(mockCreate).toHaveBeenLastCalledWith(
        expect.not.objectContaining({
          // biome-ignore lint/style/useNamingConvention: OpenAI API 필드명과 동일하게 유지
          response_format: expect.anything(),
        }),
      )
    })

    it('throws LlmProviderError on APIError without unsupported format', async () => {
      mockCreate.mockRejectedValue(
        apiError('rate limit exceeded', 'rate_limit_exceeded', 429),
      )

      await expect(client.chat('system', 'user')).rejects.toThrow(
        LlmProviderError,
      )
      await expect(client.chat('system', 'user')).rejects.toMatchObject({
        code: 'rate_limit_exceeded',
        status: 429,
      })
    })

    it('propagates unknown (non-APIError) errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('network down'))
      await expect(client.chat('system', 'user')).rejects.toThrow(
        'network down',
      )
    })
  })

  describe('listModels', () => {
    it('returns model ids from the provider', async () => {
      mockList.mockResolvedValue({
        data: [{ id: 'model-a' }, { id: 'model-b' }],
      })

      const models = await client.listModels()
      expect(models).toEqual(['model-a', 'model-b'])
    })

    it('throws LlmProviderError on APIError', async () => {
      mockList.mockRejectedValueOnce(
        apiError('unauthorized', 'unauthorized', 401),
      )
      await expect(client.listModels()).rejects.toThrow(LlmProviderError)
    })
  })

  describe('probeJson', () => {
    it('calls chat with json format and does not throw on success', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{"ok":true}' } }],
        model: baseOptions.model,
      })
      await expect(client.probeJson()).resolves.toBeUndefined()
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          // biome-ignore lint/style/useNamingConvention: OpenAI API 필드명과 동일하게 유지
          response_format: { type: 'json_object' },
        }),
      )
    })
  })
})

describe('stripCodeFence', () => {
  it.each([
    ['```json\n{"a":1}\n```', '{"a":1}'],
    ['```\n{"a":1}\n```', '{"a":1}'],
    ['```json\n{"a":1}```', '{"a":1}'],
    ['{"a":1}', '{"a":1}'],
    ['  {"a":1}  ', '{"a":1}'],
  ])('strips %p to %p', (input, expected) => {
    expect(stripCodeFence(input)).toBe(expected)
  })
})
