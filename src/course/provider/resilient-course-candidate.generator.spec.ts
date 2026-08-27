import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import type { CourseGenerationRuntimeInput } from '../schema/course-generation-input.schema'
import type { CourseGenerationOutputSnapshot } from '../schema/course-generation-output.schema'
import type { DeterministicCourseCandidateGenerator } from './deterministic-course-candidate.generator'
import type { LlmCourseCandidateGenerator } from './llm-course-candidate.generator'
import { ResilientCourseCandidateGenerator } from './resilient-course-candidate.generator'

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

function createOutput(provider: string): CourseGenerationOutputSnapshot {
  return {
    schemaVersion: 1,
    provider,
    model: 'model-1',
    candidates: [{ name: '코스 A', recommendationIds: ['rec-1'] }],
  }
}

function createGenerator() {
  const llmGenerator = { generate: jest.fn() }
  const fallbackGenerator = { generate: jest.fn() }

  const generator = new ResilientCourseCandidateGenerator(
    llmGenerator as unknown as LlmCourseCandidateGenerator,
    fallbackGenerator as unknown as DeterministicCourseCandidateGenerator,
  )

  return { generator, llmGenerator, fallbackGenerator }
}

describe('ResilientCourseCandidateGenerator', () => {
  it('AI 생성이 성공하면 그 결과를 그대로 반환한다', async () => {
    const { generator, llmGenerator, fallbackGenerator } = createGenerator()
    llmGenerator.generate.mockResolvedValue(createOutput('openai'))

    const output = await generator.generate(createRuntimeInput())

    expect(output.provider).toBe('openai')
    expect(fallbackGenerator.generate).not.toHaveBeenCalled()
  })

  it('AI 생성이 실패하면 수동 생성으로 대체한다', async () => {
    const { generator, llmGenerator, fallbackGenerator } = createGenerator()
    llmGenerator.generate.mockRejectedValue(new Error('LLM 호출 실패'))
    fallbackGenerator.generate.mockResolvedValue(createOutput('internal'))

    const runtimeInput = createRuntimeInput()
    const output = await generator.generate(runtimeInput)

    expect(output.provider).toBe('internal')
    expect(fallbackGenerator.generate).toHaveBeenCalledWith(runtimeInput)
  })
})
