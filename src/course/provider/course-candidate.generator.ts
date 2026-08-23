import type { CourseGenerationRuntimeInput } from '../schema/course-generation-input.schema'
import type { CourseGenerationOutputSnapshot } from '../schema/course-generation-output.schema'

export interface CourseCandidateGenerator {
  generate(
    input: CourseGenerationRuntimeInput,
  ): Promise<CourseGenerationOutputSnapshot>
}
