import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import type { CourseGeneratorService } from '../llm/course-generator.service'
import type { CourseGeneratorInputBuilder } from '../llm/input/course-generator-input.builder'
import type { LlmClientPort } from '../llm/llm-client'
import type { CourseGenerationRuntimeInput } from '../schema/course-generation-input.schema'
import { LlmCourseCandidateGenerator } from './llm-course-candidate.generator'

function createRuntimeInput(): CourseGenerationRuntimeInput {
  return {
    schemaVersion: 1,
    meeting: {
      meetingId: 'meeting-1',
      meetingTypeId: 'meeting-type-1',
      meetingTypeCode: MeetingTypeCode.Social,
      date: '2026-08-22',
      time: '18:00:00',
      courseVersion: 1,
      location: { latitude: 37.5, longitude: 127.0 },
    },
    participantCount: 2,
    categorySteps: [
      {
        order: 1,
        categoryId: 'category-1',
        categorySlug: CategorySlug.Restaurant,
      },
    ],
    recommendations: [
      {
        recommendationId: 'rec-1',
        placeId: 'place-1',
        placeCategoryId: 'category-1',
        categorySlug: CategorySlug.Restaurant,
        likeCount: 0,
        dislikeCount: 0,
        name: 'place-1',
        address: 'address',
        latitude: 37.5,
        longitude: 127.0,
      },
    ],
    questionnaire: null,
  }
}

function createGenerator() {
  const builtInput = { startNodeId: 'start' } as unknown as ReturnType<
    typeof JSON.parse
  >
  const inputBuilder = {
    build: jest.fn().mockResolvedValue(builtInput),
  }
  const generatorService = {
    generate: jest.fn(),
  }
  const client = {
    metadata: { provider: 'openai', model: 'gpt-4o-mini' },
  }

  const generator = new LlmCourseCandidateGenerator(
    inputBuilder as unknown as CourseGeneratorInputBuilder,
    generatorService as unknown as CourseGeneratorService,
    client as unknown as LlmClientPort,
  )

  return { generator, inputBuilder, generatorService, builtInput }
}

describe('LlmCourseCandidateGenerator', () => {
  it('빌더로 만든 입력을 CourseGeneratorService에 그대로 전달한다', async () => {
    const { generator, inputBuilder, generatorService, builtInput } =
      createGenerator()
    generatorService.generate.mockResolvedValue({
      routes: [{ routeId: 1, places: [{ placeId: '1', order: 1 }] }],
    })

    const runtimeInput = createRuntimeInput()
    await generator.generate(runtimeInput)

    expect(inputBuilder.build).toHaveBeenCalledWith(runtimeInput)
    expect(generatorService.generate).toHaveBeenCalledWith(builtInput)
  })

  it('routes를 candidates(recommendationId)로 변환하고 순서대로 이름을 붙인다', async () => {
    const { generator, generatorService } = createGenerator()
    generatorService.generate.mockResolvedValue({
      routes: [
        {
          routeId: 1,
          places: [
            { placeId: '1', order: 1 },
            { placeId: '2', order: 2 },
          ],
        },
        {
          routeId: 2,
          places: [{ placeId: '3', order: 1 }],
        },
      ],
    })

    const output = await generator.generate(createRuntimeInput())

    expect(output.provider).toBe('openai')
    expect(output.model).toBe('gpt-4o-mini')
    expect(output.candidates).toEqual([
      { name: '코스 A', recommendationIds: ['1', '2'] },
      { name: '코스 B', recommendationIds: ['3'] },
    ])
  })
})
