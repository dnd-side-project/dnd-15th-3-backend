import {
  COURSE_STRATEGY_LABELS,
  type CourseRoutePlan,
  type CourseStrategy,
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

const COURSE_SELECTOR_PROMPT = `당신은 서버가 계산한 유효 코스 후보 중에서 모임 방문 코스를 선택하는 AI입니다.

## 절대 규칙

- 거리나 점수를 직접 계산하지 마세요. 반드시 routeCandidates 안에 있는 조합(placeIds)만, 배열 순서 그대로 선택하세요. 후보에 없는 조합을 새로 만들지 마세요.
- 출력은 JSON 객체 하나만 반환하고 설명이나 마크다운을 포함하지 마세요.

## 선택 규칙

- routeCandidates 중 서로 다른 장소 구성과 성격을 가지도록 최대 3개를 고르세요.
- routes의 개수는 입력의 maxUniqueRoutes를 넘지 마세요.
- 순서만 다르고 장소 집합이 같으면 같은 코스입니다. 예: [식당A,카페B,액티비티C,액티비티D]와 [식당A,카페B,액티비티D,액티비티C]는 액티비티 두 곳 순서만 다를 뿐 동일한 코스이니 중복 출력하지 마세요.
- qna(질문-답변)가 있으면 가장 먼저 고려하세요.
- qna가 없거나 판단이 어려우면 tags를 참고하세요.
- meetingType과 isWeekend는 qna·tags를 해석할 때 참고하는 배경 맥락으로만 쓰세요.
- totalScore는 참가자들의 선호도(좋아요·싫어요 가중 점수)이며, 값이 높을수록 선호도가 높습니다.
- qna·tags로 우열을 가리기 어려우면 totalScore가 높은 쪽을 우선하세요.
- totalScore도 같으면 totalDistanceMeters가 짧은 쪽을 우선하세요.
- 완벽히 맞는 조합이 없어도 빈 배열을 반환하지 말고 가장 가까운 조합을 선택하세요.
- generationMode가 regenerate-one이면 targetStrategy의 코스 1개만 선택하세요.
- variationSeed가 있으면 기존과 다른 선택을 우선하고, 없으면 strategyDefaults를 우선 사용하세요.
- feedbackConstraints가 있으면 그 제약을 따르세요.

## 출력 제약

- places의 길이는 visitOrder의 길이와 같아야 합니다.
- placeId는 문자열입니다.
- order는 1부터 순차적으로 증가해야 합니다.
- routeId는 1부터 순차적으로 증가해야 합니다.
- 출발지는 places에 포함하지 않습니다.

## 입력 데이터

\`\`\`json
{{inputJson}}
\`\`\`

## 출력 형식

{
  "routes": [
    {
      "routeId": 1,
      "places": [
        {
          "placeId": "place-id",
          "order": 1
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
  variationSeed?: string
  startNodeId: CourseGeneratorInput['startNodeId']
  meetingType: CourseGeneratorInput['meetingType']
  isWeekend: CourseGeneratorInput['isWeekend']
  qna: CourseGeneratorInput['qna']
  visitOrder: CourseGeneratorInput['visitOrder']
  places: CourseGeneratorInput['places']
  distanceMatrix: CourseGeneratorInput['distanceMatrix']
  strategyConfig: CourseGeneratorInput['strategyConfig']
  maxUniqueRoutes: number
  routeCandidates: RouteCandidate[]
  strategyDefaults: {
    strategy: CourseStrategy
    placeIds: string[]
  }[]
  feedbackConstraints?: CourseFeedbackInterpretation
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
  const modelInput: CourseGeneratorModelInput = {
    generationMode: options.mode ?? 'initial',
    ...(options.variationSeed ? { variationSeed: options.variationSeed } : {}),
    startNodeId: input.startNodeId,
    meetingType: input.meetingType,
    isWeekend: input.isWeekend,
    qna: input.qna,
    visitOrder: input.visitOrder,
    places: input.places,
    distanceMatrix: input.distanceMatrix,
    strategyConfig: input.strategyConfig,
    maxUniqueRoutes: plan.routeCandidates.length,
    routeCandidates: plan.routeCandidates,
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
