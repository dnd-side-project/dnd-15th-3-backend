import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { QuestionnaireSource } from '../enums/questionnaire-source.enum'
import { FallbackQuestionnaireGenerator } from './fallback-questionnaire.generator'
import { OpenAiQuestionnaireGenerator } from './openai-questionnaire.generator'
import { ResilientQuestionnaireGenerator } from './resilient-questionnaire.generator'

const generationContext = {
  meetingName: '성수 나들이',
  meetingTypeCode: MeetingTypeCode.Social,
  meetingTypeName: '친목',
  schedule: {
    date: '2026-08-22',
    time: '18:30:00',
    dayOfWeek: '토요일',
    dayType: '주말' as const,
    timePeriod: '저녁' as const,
  },
  courseCategories: [
    { order: 1, slug: CategorySlug.Restaurant, name: '음식점' },
    { order: 2, slug: CategorySlug.Cafe, name: '카페' },
  ],
  recommendedPlaceCategories: [
    { slug: CategorySlug.Restaurant, name: '음식점', count: 3 },
    { slug: CategorySlug.Cafe, name: '카페', count: 2 },
  ],
}

function createConfig(apiKey = 'test-api-key', model = 'configured-model') {
  const values = new Map<string, unknown>([
    ['OPENAI_API_KEY', apiKey],
    ['OPENAI_MODEL', model],
    ['OPENAI_BASE_URL', 'https://api.openai.com/v1'],
    ['OPENAI_TIMEOUT_MS', 15000],
  ])
  return {
    get: jest.fn((key: string) => values.get(key)),
  }
}

describe('OpenAiQuestionnaireGenerator', () => {
  afterEach(() => jest.restoreAllMocks())

  it('Responses API에 JSON Schema 구조화 출력을 요청하고 응답을 다시 검증한다', async () => {
    const fallbackResult = await new FallbackQuestionnaireGenerator().generate(
      generationContext,
    )
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          model: 'response-model',
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    questions: fallbackResult.questions,
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const generator = new OpenAiQuestionnaireGenerator(createConfig() as never)

    const result = await generator.generate(generationContext)

    expect(result).toEqual({
      questions: fallbackResult.questions,
      source: QuestionnaireSource.Llm,
      provider: 'openai',
      model: 'response-model',
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer test-api-key',
        }),
      }),
    )
    const request = JSON.parse(
      String((fetchSpy.mock.calls[0][1] as RequestInit).body),
    )
    expect(request.model).toBe('configured-model')
    expect(request.max_output_tokens).toBe(2000)
    expect(request.temperature).toBe(0.4)
    expect(request.instructions).toContain('코스 생성 규칙')
    expect(request.instructions).toContain('나쁨:')
    expect(request.input).toContain('alreadyAskedQuestion')
    expect(request.input).toContain('토요일')
    expect(request.input).toContain('음식점')
    expect(request.text.format).toEqual(
      expect.objectContaining({
        type: 'json_schema',
        name: 'meeting_questionnaire_follow_ups',
        strict: true,
      }),
    )
  })

  it('응답이 도메인 스키마와 다르면 실패한다', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [{ type: 'output_text', text: '{"questions":[]}' }],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const generator = new OpenAiQuestionnaireGenerator(createConfig() as never)

    await expect(generator.generate(generationContext)).rejects.toThrow()
  })
})

describe('ResilientQuestionnaireGenerator', () => {
  it('외부 LLM이 설정되지 않으면 네트워크 호출 없이 기본 질문을 사용한다', async () => {
    const openAiGenerator = new OpenAiQuestionnaireGenerator(
      createConfig('', '') as never,
    )
    const fallbackGenerator = new FallbackQuestionnaireGenerator()
    const generator = new ResilientQuestionnaireGenerator(
      openAiGenerator,
      fallbackGenerator,
    )

    await expect(generator.generate(generationContext)).resolves.toEqual(
      expect.objectContaining({ source: QuestionnaireSource.Fallback }),
    )
  })

  it('외부 LLM 호출이 실패해도 기본 질문으로 응답한다', async () => {
    const openAiGenerator = {
      isConfigured: jest.fn().mockReturnValue(true),
      generate: jest.fn().mockRejectedValue(new Error('timeout')),
    }
    const fallbackGenerator = new FallbackQuestionnaireGenerator()
    const generator = new ResilientQuestionnaireGenerator(
      openAiGenerator as never,
      fallbackGenerator,
    )

    await expect(generator.generate(generationContext)).resolves.toEqual(
      expect.objectContaining({ source: QuestionnaireSource.Fallback }),
    )
  })
})
