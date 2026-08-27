import { Inject, Injectable } from '@nestjs/common'
import {
  buildCourseRoutePlan,
  CoursePlanningError,
  type CourseRoutePlan,
  type CourseStrategy,
  getRouteCompositionKey,
} from './course-generator.planner'
import {
  buildCourseGeneratorPrompt,
  buildFeedbackInterpreterPrompt,
  getCourseSelectorSystemPrompt,
  getFeedbackInterpreterSystemPrompt,
} from './course-generator.prompt'
import type {
  CourseCommentInput,
  CourseGenerationOptions,
} from './course-generator.request'
import type { CourseFeedbackInterpretation } from './course-generator-feedback'
import { parseCourseFeedback } from './course-generator-feedback'
import type { CourseGeneratorInput } from './course-generator-input.schema'
import {
  type CourseGeneratorOutput,
  createCourseGeneratorOutputSchema,
} from './course-generator-output.schema'
import { LLM_CLIENT, type LlmClientPort } from './llm-client'

export class CourseGeneratorError extends Error {
  constructor(
    message: string,
    readonly issues: string[],
  ) {
    super(message)
    this.name = 'CourseGeneratorError'
  }
}

const MAX_ATTEMPTS = 3

type CourseRoute = CourseGeneratorOutput['routes'][number]

function buildFeedbackPrompt(feedback: string): string {
  return `\n\n## 이전 출력 수정 요구\n\n직전 출력이 아래 검증을 통과하지 못했습니다. 지적된 문제를 모두 고쳐서 다시 출력하세요.\n${feedback}`
}

function buildFallbackOutput(
  input: CourseGeneratorInput,
  plan: CourseRoutePlan,
): CourseGeneratorOutput {
  return {
    routes: plan.selectedRoutes.map((route, routeIndex) => ({
      routeId: routeIndex + 1,
      places: route.placeIds.map((placeId, placeIndex) => ({
        placeId,
        order: placeIndex + 1,
      })),
    })),
  }
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content)
  } catch {
    return undefined
  }
}

function getExcludedCompositions(options: CourseGenerationOptions): string[] {
  const compositions = (options.reservedPlaceIds ?? []).map((placeIds) =>
    getRouteCompositionKey(placeIds),
  )

  if (options.currentPlaceIds) {
    compositions.push(getRouteCompositionKey(options.currentPlaceIds))
  }

  return [...new Set(compositions)]
}

function assertRegenerationStrategy(
  options: CourseGenerationOptions,
): asserts options is CourseGenerationOptions & {
  mode: 'regenerate-one'
  targetStrategy: CourseStrategy
} {
  if (options.mode !== 'regenerate-one') return
  if (!options.targetStrategy) {
    throw new CourseGeneratorError('재생성 대상 전략이 필요합니다.', [
      'target-strategy-required',
    ])
  }
}

@Injectable()
export class CourseGeneratorService {
  constructor(@Inject(LLM_CLIENT) private readonly client: LlmClientPort) {}

  async generate(
    input: CourseGeneratorInput,
    options: CourseGenerationOptions = {},
  ): Promise<CourseGeneratorOutput> {
    assertRegenerationStrategy(options)

    const feedback = await this.interpretCommentsIfPresent(
      input,
      options.comments,
    )
    const plan = this.buildPlan(input, options, feedback)
    const expectedRouteCount = options.mode === 'regenerate-one' ? 1 : undefined
    const schema = createCourseGeneratorOutputSchema(input, plan, {
      expectedRouteCount,
    })
    const feedbackMessages: string[] = []

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const correction =
        feedbackMessages.length > 0
          ? buildFeedbackPrompt(feedbackMessages.join('\n'))
          : ''
      const userPrompt =
        buildCourseGeneratorPrompt(input, plan, options, feedback) + correction

      let content: string
      try {
        const response = await this.client.chat(
          getCourseSelectorSystemPrompt(),
          userPrompt,
        )
        content = response.content
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '알 수 없는 호출 오류'
        feedbackMessages.push(`- AI 호출에 실패했습니다: ${message}`)
        continue
      }

      const parsed = parseJson(content)
      if (parsed === undefined) {
        feedbackMessages.push(
          '- 출력이 유효한 JSON이 아닙니다. JSON만 반환하세요.',
        )
        continue
      }

      const result = schema.safeParse(parsed)
      if (result.success) return result.data

      feedbackMessages.push(
        ...result.error.issues.map((issue) => `- ${issue.message}`),
      )
    }

    return buildFallbackOutput(input, plan)
  }

  async regenerateOne(
    input: CourseGeneratorInput,
    options: Omit<CourseGenerationOptions, 'mode'> & {
      targetStrategy: CourseStrategy
    },
  ): Promise<CourseRoute> {
    const output = await this.generate(input, {
      ...options,
      mode: 'regenerate-one',
    })
    const route = output.routes[0]
    if (!route) {
      throw new CourseGeneratorError('재생성된 코스가 없습니다.', [
        'regenerated-route-missing',
      ])
    }
    return route
  }

  private buildPlan(
    input: CourseGeneratorInput,
    options: CourseGenerationOptions,
    feedback: CourseFeedbackInterpretation | undefined,
  ): CourseRoutePlan {
    try {
      return buildCourseRoutePlan(input, {
        feedback,
        targetStrategy:
          options.mode === 'regenerate-one'
            ? options.targetStrategy
            : undefined,
        excludedCompositions: getExcludedCompositions(options),
      })
    } catch (error) {
      if (error instanceof CoursePlanningError) {
        throw new CourseGeneratorError(error.message, error.issues)
      }
      throw error
    }
  }

  private async interpretCommentsIfPresent(
    input: CourseGeneratorInput,
    comments: readonly CourseCommentInput[] | undefined,
  ): Promise<CourseFeedbackInterpretation | undefined> {
    if (!comments || comments.length === 0) return undefined

    const response = await this.client.chat(
      getFeedbackInterpreterSystemPrompt(),
      buildFeedbackInterpreterPrompt(input, comments),
    )
    const parsed = parseJson(response.content)
    if (parsed === undefined) {
      throw new CourseGeneratorError(
        '댓글을 구조화된 제약 조건으로 해석하지 못했습니다.',
        ['feedback-invalid-json'],
      )
    }

    try {
      return parseCourseFeedback(parsed)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '댓글 제약 조건이 유효하지 않습니다.'
      throw new CourseGeneratorError(message, ['feedback-schema-invalid'])
    }
  }
}
