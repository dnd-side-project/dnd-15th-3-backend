import {
  COURSE_STRATEGY_LABELS,
  type CourseRoutePlan,
  type CourseStrategy,
  getRouteCompositionKey,
  type RouteCandidate,
} from './course-generator.planner'
import type {
  CourseCommentInput,
  CourseGenerationOptions,
} from './course-generator.request'
import type { CourseFeedbackInterpretation } from './course-generator-feedback'
import type { CourseGeneratorInput } from './course-generator-input.schema'

const COURSE_SELECTOR_SYSTEM_PROMPT =
  '당신은 서버가 계산한 유효 코스 후보 중 최적의 코스를 선택하는 AI입니다. 반드시 후보에 있는 장소만 사용하고 JSON 객체 하나만 반환하세요.'

const FEEDBACK_INTERPRETER_SYSTEM_PROMPT =
  '당신은 모임 코스에 대한 자연어 댓글을 구조화된 제약 조건으로 변환하는 AI입니다. 입력에 없는 장소나 속성을 추측하지 말고 JSON 객체 하나만 반환하세요.'

const COURSE_SELECTOR_PROMPT = `당신은 서버가 사전 계산한 유효 코스 후보 중에서 모임 방문 코스를 선택하는 AI입니다.

## 절대 규칙

- 거리나 점수를 직접 계산하지 마세요.
- 입력에 있는 routeCandidates와 selectionPools의 값을 그대로 사용하세요.
- placeIds는 서버가 전달한 후보의 배열을 순서 그대로 복사하세요.
- 후보에 없는 장소를 만들거나 장소 순서를 바꾸지 마세요.
- 출력은 JSON 객체 하나만 반환하고 설명이나 마크다운을 포함하지 마세요.

## 선택 규칙

 - generationMode가 initial이면 각 전략에서 최대 1개씩 선택하세요.
 - generationMode가 regenerate-one이면 targetStrategy의 코스 1개만 선택하세요.
 - routes의 개수는 입력의 maxUniqueRoutes를 넘지 말고, 가능한 고유 후보가 있는 만큼만 반환하세요.
 - 각 코스의 strategy는 다음 안정적인 ID 중 하나만 사용하세요: distance_minimization, preference_first, balanced.
 - selectionPools는 각 전략에서 허용된 Top-K 후보입니다. 반드시 해당 전략의 selectionPools 안에서 선택하세요.
 - 동일한 장소 구성의 코스를 중복 출력하지 마세요. 순서가 달라도 같은 장소 집합이면 중복입니다.
 - 모든 전략의 후보가 같은 장소 구성을 가리키면 그 구성은 한 번만 출력하세요.
 - variationSeed가 있으면 같은 후보만 반복하지 말고, 허용된 후보 중 seed에 맞는 서로 다른 선택을 우선하세요.
 - variationSeed가 없으면 strategyDefaults의 서로 다른 기본 후보를 우선 사용하세요.
- 댓글 제약이 있으면 서버가 해석한 feedbackConstraints를 따르세요.

## 전략 라벨

- distance_minimization: 이동거리최소화
- preference_first: 선호도우선
- balanced: 균형

## 출력 제약

- places의 길이는 visitOrder의 길이와 같아야 합니다.
- places의 category는 visitOrder와 같은 순서여야 합니다.
- placeId는 문자열입니다.
- order는 1부터 순차적으로 증가해야 합니다.
- 출발지는 places에 포함하지 않습니다.

## 입력 데이터

{{inputJson}}

## 출력 형식

{
  "routes": [
    {
      "routeId": 1,
      "strategy": "distance_minimization",
      "places": [
        {
          "placeId": "place-id",
          "order": 1,
          "category": "식당"
        }
      ]
    }
  ]
}
`

const FEEDBACK_INTERPRETER_PROMPT = `다음 댓글을 코스 재생성에 사용할 구조화된 제약 조건으로 변환하세요.

## 해석 규칙

- kind는 include, exclude, prefer, avoid 중 하나입니다.
- target은 place, category, tag 중 하나입니다.
- 입력 장소의 id, category, tags에 존재하는 값만 사용하세요.
- hard 제약은 반드시 만족해야 하는 요구입니다.
- soft 제약은 가능한 경우 반영하는 선호입니다.
- 장소 데이터로 확인할 수 없는 내용은 unresolved에 이유를 작성하세요.
- 댓글의 감정이나 일반적인 칭찬은 제약으로 만들지 마세요.
- JSON 객체 하나만 반환하세요.

## 장소 데이터와 댓글

{{inputJson}}

## 출력 형식

{
  "constraints": [
    {
      "kind": "exclude",
      "target": "category",
      "values": ["술/바"],
      "strength": "hard",
      "weight": 1,
      "commentIds": ["comment-id"]
    }
  ],
  "unresolved": []
}
`

type CourseGeneratorModelInput = {
  generationMode: CourseGenerationOptions['mode']
  targetStrategy?: CourseStrategy
  variationSeed?: string
  startNodeId: CourseGeneratorInput['startNodeId']
  visitOrder: CourseGeneratorInput['visitOrder']
  places: CourseGeneratorInput['places']
  strategyConfig: CourseGeneratorInput['strategyConfig']
  maxUniqueRoutes: number
  routeCandidates: RouteCandidate[]
  selectionPools: CourseRoutePlan['selectionPools']
  strategyDefaults: {
    strategy: CourseStrategy
    placeIds: string[]
  }[]
  feedbackConstraints?: CourseFeedbackInterpretation
}

function getPromptCandidates(
  selectionPools: CourseRoutePlan['selectionPools'],
): RouteCandidate[] {
  const candidates = new Map<string, RouteCandidate>()
  for (const pool of Object.values(selectionPools)) {
    for (const candidate of pool) {
      candidates.set(getRouteCompositionKey(candidate.placeIds), candidate)
    }
  }
  return [...candidates.values()]
}

export function getCourseSelectorSystemPrompt(): string {
  return COURSE_SELECTOR_SYSTEM_PROMPT
}

export function getFeedbackInterpreterSystemPrompt(): string {
  return FEEDBACK_INTERPRETER_SYSTEM_PROMPT
}

export function buildCourseGeneratorPrompt(
  input: CourseGeneratorInput,
  plan: CourseRoutePlan,
  options: CourseGenerationOptions = {},
  feedback?: CourseFeedbackInterpretation,
): string {
  const promptCandidates = getPromptCandidates(plan.selectionPools)
  const modelInput: CourseGeneratorModelInput = {
    generationMode: options.mode ?? 'initial',
    ...(options.targetStrategy
      ? { targetStrategy: options.targetStrategy }
      : {}),
    ...(options.variationSeed ? { variationSeed: options.variationSeed } : {}),
    startNodeId: input.startNodeId,
    visitOrder: input.visitOrder,
    places: input.places,
    strategyConfig: {
      balancedMaxDistanceRatio: input.strategyConfig.balancedMaxDistanceRatio,
      variationTopK: input.strategyConfig.variationTopK,
      beamWidth: input.strategyConfig.beamWidth,
      maxSearchStates: input.strategyConfig.maxSearchStates,
    },
    maxUniqueRoutes:
      options.mode === 'regenerate-one' ? 1 : promptCandidates.length,
    routeCandidates: promptCandidates,
    selectionPools: plan.selectionPools,
    strategyDefaults: plan.selectedRoutes.map(({ strategy, placeIds }) => ({
      strategy,
      placeIds,
    })),
    ...(feedback ? { feedbackConstraints: feedback } : {}),
  }

  return COURSE_SELECTOR_PROMPT.replace(
    '{{inputJson}}',
    JSON.stringify(modelInput),
  )
}

export function buildFeedbackInterpreterPrompt(
  input: CourseGeneratorInput,
  comments: readonly CourseCommentInput[],
): string {
  return FEEDBACK_INTERPRETER_PROMPT.replace(
    '{{inputJson}}',
    JSON.stringify({
      places: input.places,
      visitOrder: input.visitOrder,
      comments,
    }),
  )
}

export { COURSE_STRATEGY_LABELS }
