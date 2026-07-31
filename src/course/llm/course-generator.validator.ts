import type { CourseGeneratorInput } from './course-generator-input.schema'
import {
  type CourseGeneratorOutput,
  createCourseGeneratorOutputSchema,
} from './course-generator-output.schema'

export class CourseGeneratorValidationError extends Error {
  constructor(
    message: string,
    readonly issues: string[],
  ) {
    super(message)
    this.name = 'CourseGeneratorValidationError'
  }
}

export function parseCourseGeneratorOutput(
  raw: string,
  input: CourseGeneratorInput,
): CourseGeneratorOutput {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new CourseGeneratorValidationError(
      'LLM 출력이 유효한 JSON이 아닙니다.',
      ['invalid-json'],
    )
  }

  const result = createCourseGeneratorOutputSchema(input).safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => issue.message)
    throw new CourseGeneratorValidationError(
      `LLM 출력 검증 실패: ${issues.join(' / ')}`,
      issues,
    )
  }
  return result.data
}
