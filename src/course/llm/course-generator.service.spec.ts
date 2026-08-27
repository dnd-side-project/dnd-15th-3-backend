import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildCourseRoutePlan,
  getRouteCompositionKey,
} from './course-generator.planner'
import { CourseGeneratorService } from './course-generator.service'
import { parseCourseGeneratorInput } from './course-generator-input.schema'
import { LLM_CLIENT, type LlmClient } from './llm-client'

const fixturesDir = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'promptfoo',
  'fixtures',
)

function loadInputFixture(name: string) {
  const raw = readFileSync(resolve(fixturesDir, `${name}.json`), 'utf8')
  return parseCourseGeneratorInput(JSON.parse(raw))
}

function loadExpectedOutput(name: string): string {
  return readFileSync(resolve(fixturesDir, `${name}.expected.json`), 'utf8')
}

function createMockClient(): {
  client: Pick<LlmClient, 'chat'>
  mockChat: jest.Mock
} {
  const mockChat = jest.fn()
  return {
    client: { chat: mockChat },
    mockChat,
  }
}

describe('CourseGeneratorService', () => {
  describe('generate', () => {
    it('returns a validated course output for the normal fixture', async () => {
      const input = loadInputFixture('input-normal')
      const { client, mockChat } = createMockClient()
      mockChat.mockResolvedValue({
        content: loadExpectedOutput('input-normal'),
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
      })

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      const output = await service.generate(input)

      const categoryByPlaceId = new Map(
        input.places.map((place) => [place.id, place.category]),
      )

      expect(output.routes).toHaveLength(3)
      expect(
        output.routes[0].places.map((place) =>
          categoryByPlaceId.get(place.placeId),
        ),
      ).toEqual(input.visitOrder)
      expect(mockChat).toHaveBeenCalledTimes(1)
    })

    it('returns a single route when candidates are tight', async () => {
      const input = loadInputFixture('input-category-tight')
      const { client, mockChat } = createMockClient()
      mockChat.mockResolvedValue({
        content: loadExpectedOutput('input-category-tight'),
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
      })

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      const output = await service.generate(input)

      expect(output.routes).toHaveLength(1)
    })

    it('passes the built prompt to the client', async () => {
      const input = loadInputFixture('input-normal')
      const { client, mockChat } = createMockClient()
      mockChat.mockResolvedValue({
        content: loadExpectedOutput('input-normal'),
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
      })

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      await service.generate(input)

      const [systemPrompt, userPrompt] = mockChat.mock.calls[0]
      expect(systemPrompt).toContain('유효 코스 후보 중 최적')
      expect(userPrompt).toContain('"startNodeId":"start"')
      expect(userPrompt).toContain('"meetingType"')
      expect(userPrompt).toContain('"distanceMatrix"')
      expect(userPrompt).toContain('"routeCandidates"')
      expect(userPrompt).toContain('"totalDistanceMeters"')
      expect(userPrompt).not.toContain('"selectionPools"')
      expect(userPrompt).not.toContain('"feedbackConstraints"')
    })

    it('retries with feedback when the first output is invalid JSON', async () => {
      const input = loadInputFixture('input-normal')
      const { client, mockChat } = createMockClient()
      mockChat
        .mockResolvedValueOnce({
          content: '이건 JSON이 아닙니다',
          model: 'nvidia/nemotron-3-ultra-550b-a55b',
        })
        .mockResolvedValueOnce({
          content: loadExpectedOutput('input-normal'),
          model: 'nvidia/nemotron-3-ultra-550b-a55b',
        })

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      const output = await service.generate(input)

      expect(output.routes).toHaveLength(3)
      expect(mockChat).toHaveBeenCalledTimes(2)
      const [, retryPrompt] = mockChat.mock.calls[1]
      expect(retryPrompt).toContain('유효한 JSON이 아닙니다')
    })

    it('retries with feedback when the output fails schema validation', async () => {
      const input = loadInputFixture('input-normal')
      const { client, mockChat } = createMockClient()

      const invalid = JSON.parse(loadExpectedOutput('input-normal'))
      // '4'(cafe) 대신 visitOrder[1]('cafe')과 카테고리가 다른 '9'(bar)를 넣어
      // 서버가 placeId로 조회한 실제 카테고리가 기대와 다르게 만든다.
      invalid.routes[0].places[1].placeId = '9'

      mockChat
        .mockResolvedValueOnce({
          content: JSON.stringify(invalid),
          model: 'nvidia/nemotron-3-ultra-550b-a55b',
        })
        .mockResolvedValueOnce({
          content: loadExpectedOutput('input-normal'),
          model: 'nvidia/nemotron-3-ultra-550b-a55b',
        })

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      const output = await service.generate(input)

      expect(output.routes).toHaveLength(3)
      expect(mockChat).toHaveBeenCalledTimes(2)
      const [, retryPrompt] = mockChat.mock.calls[1]
      expect(retryPrompt).toContain('카테고리')
    })

    it('falls back to server routes after MAX_ATTEMPTS of invalid JSON', async () => {
      const input = loadInputFixture('input-normal')
      const { client, mockChat } = createMockClient()
      mockChat.mockResolvedValue({
        content: 'not json',
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
      })

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      const output = await service.generate(input)

      expect(output.routes[0].places.map((place) => place.placeId)).toEqual([
        '1',
        '4',
        '8',
        '7',
        '10',
      ])
      expect(mockChat).toHaveBeenCalledTimes(3)
    })

    it('falls back to server routes when the AI call fails', async () => {
      const input = loadInputFixture('input-normal')
      const { client, mockChat } = createMockClient()
      mockChat.mockRejectedValue(new Error('provider unavailable'))

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      const output = await service.generate(input)

      expect(output.routes).toHaveLength(3)
      expect(mockChat).toHaveBeenCalledTimes(3)
    })

    it('regenerates one course without comments using a different candidate', async () => {
      const input = loadInputFixture('input-normal')
      const currentPlaceIds = ['1', '4', '8', '7', '10']
      const reservedPlaceIds = [
        ['2', '3', '5', '6', '9'],
        ['1', '4', '5', '6', '9'],
      ]
      const plan = buildCourseRoutePlan(input, {
        targetStrategy: 'distance_minimization',
        excludedCompositions: reservedPlaceIds.map(getRouteCompositionKey),
        excludedSequences: [currentPlaceIds.join(',')],
      })
      const candidate = plan.selectionPools.distance_minimization[0]
      expect(candidate).toBeDefined()

      const selectorOutput = {
        routes: [
          {
            routeId: 1,
            places: candidate.placeIds.map((placeId, index) => ({
              placeId,
              order: index + 1,
            })),
          },
        ],
      }
      const { client, mockChat } = createMockClient()
      mockChat.mockResolvedValue({
        content: JSON.stringify(selectorOutput),
        model: 'test-model',
      })

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      const output = await service.regenerateOne(input, {
        targetStrategy: 'distance_minimization',
        currentPlaceIds,
        reservedPlaceIds,
      })

      expect(output.places.map((place) => place.placeId)).toEqual(
        candidate.placeIds,
      )
      expect(mockChat).toHaveBeenCalledTimes(1)
    })

    it('applies hard comment constraints during regeneration', async () => {
      const input = loadInputFixture('input-normal')
      const { client, mockChat } = createMockClient()
      mockChat
        .mockResolvedValueOnce({
          content: JSON.stringify({
            constraints: [
              {
                kind: 'exclude',
                target: 'place',
                values: ['10'],
                strength: 'hard',
                weight: 1,
                commentIds: ['comment-1'],
              },
            ],
            unresolved: [],
          }),
          model: 'test-model',
        })
        .mockResolvedValue('not json')

      const service = new CourseGeneratorService(client as unknown as LlmClient)
      const output = await service.regenerateOne(input, {
        targetStrategy: 'distance_minimization',
        currentPlaceIds: ['1', '4', '8', '7', '10'],
        comments: [{ id: 'comment-1', content: '장소 10은 제외해줘' }],
      })

      expect(output.places.map((place) => place.placeId)).not.toContain('10')
      expect(mockChat).toHaveBeenCalledTimes(4)
      expect(mockChat.mock.calls[0][1]).toContain('comment-1')
    })
  })
})
