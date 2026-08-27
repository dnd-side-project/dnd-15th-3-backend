import { Inject, Injectable } from '@nestjs/common'
import { CourseGeneratorService } from '../llm/course-generator.service'
import { CourseGeneratorInputBuilder } from '../llm/input/course-generator-input.builder'
import { LLM_CLIENT, type LlmClientPort } from '../llm/llm-client'
import type { CourseGenerationRuntimeInput } from '../schema/course-generation-input.schema'
import {
  type CourseGenerationOutputSnapshot,
  courseGenerationOutputSchema,
} from '../schema/course-generation-output.schema'
import type { CourseCandidateGenerator } from './course-candidate.generator'

const CANDIDATE_NAME_PREFIX = '코스 '
const CANDIDATE_NAME_LETTERS = ['A', 'B', 'C'] as const

@Injectable()
export class LlmCourseCandidateGenerator implements CourseCandidateGenerator {
  constructor(
    private readonly inputBuilder: CourseGeneratorInputBuilder,
    private readonly generatorService: CourseGeneratorService,
    @Inject(LLM_CLIENT) private readonly client: LlmClientPort,
  ) {}

  async generate(
    input: CourseGenerationRuntimeInput,
  ): Promise<CourseGenerationOutputSnapshot> {
    const generatorInput = await this.inputBuilder.build(input)
    const output = await this.generatorService.generate(generatorInput)

    return courseGenerationOutputSchema.parse({
      schemaVersion: 1,
      provider: this.client.metadata.provider,
      model: this.client.metadata.model,
      candidates: output.routes.map((route, index) => ({
        name: `${CANDIDATE_NAME_PREFIX}${CANDIDATE_NAME_LETTERS[index] ?? index + 1}`,
        recommendationIds: route.places.map((place) => place.placeId),
      })),
    })
  }
}
