import { Injectable, Logger } from '@nestjs/common'
import type { CourseGenerationRuntimeInput } from '../schema/course-generation-input.schema'
import type { CourseGenerationOutputSnapshot } from '../schema/course-generation-output.schema'
import type { CourseCandidateGenerator } from './course-candidate.generator'
import { DeterministicCourseCandidateGenerator } from './deterministic-course-candidate.generator'
import { LlmCourseCandidateGenerator } from './llm-course-candidate.generator'

@Injectable()
export class ResilientCourseCandidateGenerator
  implements CourseCandidateGenerator
{
  private readonly logger = new Logger(ResilientCourseCandidateGenerator.name)

  constructor(
    private readonly llmGenerator: LlmCourseCandidateGenerator,
    private readonly fallbackGenerator: DeterministicCourseCandidateGenerator,
  ) {}

  async generate(
    input: CourseGenerationRuntimeInput,
  ): Promise<CourseGenerationOutputSnapshot> {
    try {
      return await this.llmGenerator.generate(input)
    } catch (error) {
      this.logger.warn(
        'AI 코스 생성에 실패해 수동 코스 생성으로 대체합니다.',
        error instanceof Error ? error.message : String(error),
      )
      return this.fallbackGenerator.generate(input)
    }
  }
}
