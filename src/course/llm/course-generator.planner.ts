import type {
  CourseFeedbackInterpretation,
  FeedbackConstraint,
} from './course-generator-feedback'
import type { CourseGeneratorInput } from './course-generator-input.schema'

export const COURSE_STRATEGIES = [
  'distance_minimization',
  'preference_first',
  'balanced',
] as const

export type CourseStrategy = (typeof COURSE_STRATEGIES)[number]

export const COURSE_STRATEGY_LABELS = new Map<CourseStrategy, string>([
  ['distance_minimization', '이동거리최소화'],
  ['preference_first', '선호도우선'],
  ['balanced', '균형'],
])

export type CoursePlace = CourseGeneratorInput['places'][number]

export type RouteCandidate = {
  placeIds: string[]
  totalDistanceMeters: number
  totalScore: number
  feedbackScore?: number
}

export type StrategyRouteCandidate = RouteCandidate & {
  strategy: CourseStrategy
}

export type StrategySelectionPools = Record<CourseStrategy, RouteCandidate[]>

export type CourseRoutePlan = {
  stepCandidates: CoursePlace[][]
  routeCandidates: RouteCandidate[]
  selectionPools: StrategySelectionPools
  selectedRoutes: StrategyRouteCandidate[]
  balancedMaxDistanceRatio: number
  searchComplete: boolean
}

export type CoursePlanningOptions = {
  feedback?: CourseFeedbackInterpretation
  targetStrategy?: CourseStrategy
  excludedCompositions?: readonly string[]
  excludedSequences?: readonly string[]
}

export class CoursePlanningError extends Error {
  constructor(
    message: string,
    readonly issues: string[],
  ) {
    super(message)
    this.name = 'CoursePlanningError'
  }
}

const EPSILON = 1e-9

function isCourseStrategy(value: string): value is CourseStrategy {
  return COURSE_STRATEGIES.includes(value as CourseStrategy)
}

export function getRouteSequenceKey(placeIds: readonly string[]): string {
  return placeIds.join(',')
}

export function getRouteCompositionKey(placeIds: readonly string[]): string {
  return [...placeIds].sort().join(',')
}

function compareSequences(left: RouteCandidate, right: RouteCandidate): number {
  for (let index = 0; index < left.placeIds.length; index += 1) {
    const difference = left.placeIds[index].localeCompare(right.placeIds[index])
    if (difference !== 0) return difference
  }
  return left.placeIds.length - right.placeIds.length
}

function getEffectiveScore(candidate: RouteCandidate): number {
  return candidate.totalScore + (candidate.feedbackScore ?? 0)
}

function compareDistanceThenScore(
  left: RouteCandidate,
  right: RouteCandidate,
): number {
  if (
    Math.abs(left.totalDistanceMeters - right.totalDistanceMeters) > EPSILON
  ) {
    return left.totalDistanceMeters - right.totalDistanceMeters
  }
  if (Math.abs(getEffectiveScore(left) - getEffectiveScore(right)) > EPSILON) {
    return getEffectiveScore(right) - getEffectiveScore(left)
  }
  return compareSequences(left, right)
}

function compareScoreThenDistance(
  left: RouteCandidate,
  right: RouteCandidate,
): number {
  if (Math.abs(getEffectiveScore(left) - getEffectiveScore(right)) > EPSILON) {
    return getEffectiveScore(right) - getEffectiveScore(left)
  }
  if (
    Math.abs(left.totalDistanceMeters - right.totalDistanceMeters) > EPSILON
  ) {
    return left.totalDistanceMeters - right.totalDistanceMeters
  }
  return compareSequences(left, right)
}

export function getStrategyRanking(
  routeCandidates: readonly RouteCandidate[],
  strategy: CourseStrategy,
  balancedMaxDistanceRatio: number,
): RouteCandidate[] {
  if (strategy === 'distance_minimization') {
    return [...routeCandidates].sort(compareDistanceThenScore)
  }

  if (strategy === 'preference_first') {
    return [...routeCandidates].sort(compareScoreThenDistance)
  }

  if (routeCandidates.length === 0) return []

  const shortestDistance = Math.min(
    ...routeCandidates.map((route) => route.totalDistanceMeters),
  )
  return routeCandidates
    .filter(
      (route) =>
        route.totalDistanceMeters <=
        shortestDistance * balancedMaxDistanceRatio + EPSILON,
    )
    .sort(compareScoreThenDistance)
}

function getDistance(
  input: CourseGeneratorInput,
  fromNodeId: string,
  toPlaceId: string,
): number | null {
  const distance = input.distanceMatrix.values[fromNodeId]?.[toPlaceId]
  if (distance === undefined || !Number.isFinite(distance) || distance < 0) {
    return null
  }
  return distance
}

function matchesConstraint(
  place: CoursePlace,
  constraint: FeedbackConstraint,
): boolean {
  if (constraint.target === 'place') {
    return constraint.values.includes(place.id)
  }
  if (constraint.target === 'category') {
    return constraint.values.includes(place.category)
  }
  return place.tags.some((tag) => constraint.values.includes(tag))
}

function routeMatchesConstraint(
  places: readonly CoursePlace[],
  constraint: FeedbackConstraint,
): boolean {
  return places.some((place) => matchesConstraint(place, constraint))
}

function violatesHardExclusion(
  places: readonly CoursePlace[],
  feedback: CourseFeedbackInterpretation | undefined,
): boolean {
  return Boolean(
    feedback?.constraints.some(
      (constraint) =>
        constraint.strength === 'hard' &&
        constraint.kind === 'exclude' &&
        routeMatchesConstraint(places, constraint),
    ),
  )
}

function satisfiesHardConstraints(
  places: readonly CoursePlace[],
  feedback: CourseFeedbackInterpretation | undefined,
): boolean {
  return Boolean(
    !feedback ||
      feedback.constraints.every((constraint) => {
        if (constraint.strength !== 'hard') return true
        const matches = routeMatchesConstraint(places, constraint)
        if (constraint.kind === 'exclude') return !matches
        if (constraint.kind === 'include') {
          return constraint.values.every((value) =>
            places.some((place) =>
              matchesConstraint(place, { ...constraint, values: [value] }),
            ),
          )
        }
        return true
      }),
  )
}

function calculateFeedbackScore(
  places: readonly CoursePlace[],
  feedback: CourseFeedbackInterpretation | undefined,
): number {
  if (!feedback) return 0

  return feedback.constraints.reduce((score, constraint) => {
    if (constraint.strength !== 'soft') return score
    const matches = places.filter((place) =>
      matchesConstraint(place, constraint),
    ).length
    if (matches === 0) return score

    const direction =
      constraint.kind === 'prefer' || constraint.kind === 'include' ? 1 : -1
    return score + direction * constraint.weight * matches
  }, 0)
}

function getPlaceMap(input: CourseGeneratorInput): Map<string, CoursePlace> {
  return new Map(input.places.map((place) => [place.id, place]))
}

function buildCandidate(
  selected: readonly CoursePlace[],
  totalDistanceMeters: number,
  totalScore: number,
  feedback: CourseFeedbackInterpretation | undefined,
): RouteCandidate {
  const feedbackScore = calculateFeedbackScore(selected, feedback)
  return {
    placeIds: selected.map((place) => place.id),
    totalDistanceMeters,
    totalScore,
    ...(feedbackScore !== 0 ? { feedbackScore } : {}),
  }
}

type SearchState = {
  selected: CoursePlace[]
  usedIds: Set<string>
  totalDistanceMeters: number
  totalScore: number
}

function comparePartialStates(
  left: SearchState,
  right: SearchState,
  strategy: CourseStrategy,
  feedback: CourseFeedbackInterpretation | undefined,
): number {
  if (strategy === 'distance_minimization') {
    if (
      Math.abs(left.totalDistanceMeters - right.totalDistanceMeters) > EPSILON
    ) {
      return left.totalDistanceMeters - right.totalDistanceMeters
    }
  } else {
    const leftScore =
      left.totalScore + calculateFeedbackScore(left.selected, feedback)
    const rightScore =
      right.totalScore + calculateFeedbackScore(right.selected, feedback)
    if (Math.abs(leftScore - rightScore) > EPSILON) {
      return rightScore - leftScore
    }
  }

  return left.selected
    .map((place) => place.id)
    .join(',')
    .localeCompare(right.selected.map((place) => place.id).join(','))
}

function searchCandidates(
  input: CourseGeneratorInput,
  stepCandidates: readonly CoursePlace[][],
  strategy: CourseStrategy,
  feedback: CourseFeedbackInterpretation | undefined,
): { candidates: RouteCandidate[]; complete: boolean } {
  let states: SearchState[] = [
    { selected: [], usedIds: new Set(), totalDistanceMeters: 0, totalScore: 0 },
  ]
  let expandedStates = 0
  let complete = true

  for (const places of stepCandidates) {
    const nextStates: SearchState[] = []

    for (const state of states) {
      for (const place of places) {
        expandedStates += 1
        if (expandedStates > input.strategyConfig.maxSearchStates) {
          complete = false
          break
        }
        if (state.usedIds.has(place.id)) continue

        const fromNodeId =
          state.selected.length === 0
            ? input.startNodeId
            : state.selected[state.selected.length - 1].id
        const edgeDistance = getDistance(input, fromNodeId, place.id)
        if (edgeDistance === null) continue

        const selected = [...state.selected, place]
        if (violatesHardExclusion(selected, feedback)) continue

        const usedIds = new Set(state.usedIds)
        usedIds.add(place.id)
        nextStates.push({
          selected,
          usedIds,
          totalDistanceMeters: state.totalDistanceMeters + edgeDistance,
          totalScore: state.totalScore + place.score,
        })
      }
      if (!complete) break
    }

    nextStates.sort((left, right) =>
      comparePartialStates(left, right, strategy, feedback),
    )
    if (nextStates.length > input.strategyConfig.beamWidth) complete = false
    states = nextStates.slice(0, input.strategyConfig.beamWidth)
    if (states.length === 0) break
  }

  const candidates = states
    .filter((state) => satisfiesHardConstraints(state.selected, feedback))
    .map((state) =>
      buildCandidate(
        state.selected,
        state.totalDistanceMeters,
        state.totalScore,
        feedback,
      ),
    )

  // 카테고리가 중복되는 슬롯(예: 액티비티 2곳)은 방문 순서만 다른 동일한
  // 장소 구성을 별개 후보로 만들어낸다. 정렬된 구성 기준으로 먼저 나온
  // (= 이 전략의 정렬 기준상 더 나은) 것만 남기고 중복을 제거한다.
  const seenCompositions = new Set<string>()
  const dedupedCandidates = candidates.filter((candidate) => {
    const compositionKey = getRouteCompositionKey(candidate.placeIds)
    if (seenCompositions.has(compositionKey)) return false
    seenCompositions.add(compositionKey)
    return true
  })

  return { candidates: dedupedCandidates, complete }
}

function refineStepCandidates(input: CourseGeneratorInput): CoursePlace[][] {
  const placesByCategory = new Map<string, CoursePlace[]>()
  const issues: string[] = []

  for (const place of input.places) {
    if (!Number.isFinite(place.score)) {
      issues.push(`placeId ${place.id}의 score가 유효한 숫자가 아닙니다.`)
    }

    const categoryPlaces = placesByCategory.get(place.category) ?? []
    categoryPlaces.push(place)
    placesByCategory.set(place.category, categoryPlaces)
  }

  if (
    new Set(input.places.map((place) => place.id)).size !== input.places.length
  ) {
    issues.push('장소 id는 서로 달라야 합니다.')
  }

  const requiredCounts = new Map<string, number>()
  for (const category of input.visitOrder) {
    requiredCounts.set(category, (requiredCounts.get(category) ?? 0) + 1)
  }

  for (const [category, requiredCount] of requiredCounts) {
    const candidates = placesByCategory.get(category) ?? []
    if (candidates.length < requiredCount) {
      issues.push(
        `${category} 카테고리 후보가 ${requiredCount}개 필요하지만 ${candidates.length}개입니다.`,
      )
    }
  }

  if (issues.length > 0) {
    throw new CoursePlanningError('코스 후보를 정제하지 못했습니다.', issues)
  }

  return input.visitOrder.map((category) => [
    ...(placesByCategory.get(category) ?? []),
  ])
}

function createSelectionPools(
  candidates: readonly RouteCandidate[],
  balancedMaxDistanceRatio: number,
  variationTopK: number,
  excludedCompositions: ReadonlySet<string>,
  excludedSequences: ReadonlySet<string>,
): StrategySelectionPools {
  const pools = {} as StrategySelectionPools

  for (const strategy of COURSE_STRATEGIES) {
    const pool: RouteCandidate[] = []
    const compositions = new Set<string>()
    const ranking = getStrategyRanking(
      candidates,
      strategy,
      balancedMaxDistanceRatio,
    )

    for (const candidate of ranking) {
      const sequence = getRouteSequenceKey(candidate.placeIds)
      const composition = getRouteCompositionKey(candidate.placeIds)
      if (
        excludedSequences.has(sequence) ||
        excludedCompositions.has(composition)
      ) {
        continue
      }
      if (compositions.has(composition)) continue
      pool.push(candidate)
      compositions.add(composition)
      if (pool.length >= variationTopK) break
    }

    pools[strategy] = pool
  }

  return pools
}

function selectStrategyRoutes(
  candidates: readonly RouteCandidate[],
  balancedMaxDistanceRatio: number,
  strategies: readonly CourseStrategy[],
  excludedCompositions: ReadonlySet<string>,
  excludedSequences: ReadonlySet<string>,
): StrategyRouteCandidate[] {
  const selectedRoutes: StrategyRouteCandidate[] = []
  const usedCompositions = new Set<string>(excludedCompositions)

  for (const strategy of strategies) {
    const candidate = getStrategyRanking(
      candidates,
      strategy,
      balancedMaxDistanceRatio,
    ).find((route) => {
      const composition = getRouteCompositionKey(route.placeIds)
      const sequence = getRouteSequenceKey(route.placeIds)
      return (
        !usedCompositions.has(composition) && !excludedSequences.has(sequence)
      )
    })

    if (!candidate) continue

    selectedRoutes.push({ ...candidate, strategy })
    usedCompositions.add(getRouteCompositionKey(candidate.placeIds))
  }

  return selectedRoutes
}

export function calculateRouteMetrics(
  placeIds: readonly string[],
  input: CourseGeneratorInput,
  feedback?: CourseFeedbackInterpretation,
): RouteCandidate | null {
  const placesById = getPlaceMap(input)
  let previousNodeId: string = input.startNodeId
  let totalDistanceMeters = 0
  let totalScore = 0
  const places: CoursePlace[] = []

  for (const [index, placeId] of placeIds.entries()) {
    const place = placesById.get(placeId)
    if (!place || place.category !== input.visitOrder[index]) return null

    const distance = getDistance(input, previousNodeId, place.id)
    if (distance === null) return null

    totalDistanceMeters += distance
    totalScore += place.score
    previousNodeId = place.id
    places.push(place)
  }

  if (!satisfiesHardConstraints(places, feedback)) return null

  return buildCandidate(places, totalDistanceMeters, totalScore, feedback)
}

export function buildCourseRoutePlan(
  input: CourseGeneratorInput,
  options: CoursePlanningOptions = {},
): CourseRoutePlan {
  const stepCandidates = refineStepCandidates(input)
  const strategies = options.targetStrategy
    ? [options.targetStrategy]
    : [...COURSE_STRATEGIES]
  // 전략별로 서로 다른 방문 순서를 찾아내더라도 장소 구성이 같으면 같은
  // 후보로 취급해야 하므로, 구성(정렬된 placeIds) 기준으로 합치면서
  // 그중 가장 나은 후보만 남긴다.
  const allCandidates = new Map<string, RouteCandidate>()
  let searchComplete = true

  for (const strategy of strategies) {
    const result = searchCandidates(
      input,
      stepCandidates,
      strategy,
      options.feedback,
    )
    searchComplete = searchComplete && result.complete
    for (const candidate of result.candidates) {
      const composition = getRouteCompositionKey(candidate.placeIds)
      const existing = allCandidates.get(composition)
      if (!existing || compareDistanceThenScore(candidate, existing) < 0) {
        allCandidates.set(composition, candidate)
      }
    }
  }

  const excludedCompositions = new Set(options.excludedCompositions ?? [])
  const excludedSequences = new Set(options.excludedSequences ?? [])
  const routeCandidates = [...allCandidates.values()].filter((candidate) => {
    const sequence = getRouteSequenceKey(candidate.placeIds)
    const composition = getRouteCompositionKey(candidate.placeIds)
    return (
      !excludedSequences.has(sequence) && !excludedCompositions.has(composition)
    )
  })

  if (routeCandidates.length === 0) {
    throw new CoursePlanningError('조건을 만족하는 유효한 코스가 없습니다.', [
      'no-feasible-route',
    ])
  }

  const selectionPools = createSelectionPools(
    routeCandidates,
    input.strategyConfig.balancedMaxDistanceRatio,
    input.strategyConfig.variationTopK,
    excludedCompositions,
    excludedSequences,
  )
  const selectedRoutes = selectStrategyRoutes(
    routeCandidates,
    input.strategyConfig.balancedMaxDistanceRatio,
    strategies,
    excludedCompositions,
    excludedSequences,
  )

  if (selectedRoutes.length === 0) {
    throw new CoursePlanningError('전략별로 선택 가능한 코스가 없습니다.', [
      'no-selectable-route',
    ])
  }

  return {
    stepCandidates,
    routeCandidates,
    selectionPools,
    selectedRoutes,
    balancedMaxDistanceRatio: input.strategyConfig.balancedMaxDistanceRatio,
    searchComplete,
  }
}

export function validateStrategySelection(
  routes: readonly { strategy: string; placeIds: readonly string[] }[],
  plan: CourseRoutePlan,
): string[] {
  const issues: string[] = []
  const outputCompositions = routes.map((route) =>
    getRouteCompositionKey(route.placeIds),
  )
  const usedStrategies = new Set<string>()

  for (const [routeIndex, route] of routes.entries()) {
    if (!isCourseStrategy(route.strategy)) {
      issues.push(`${routeIndex + 1}번째 코스의 전략이 유효하지 않습니다.`)
      continue
    }
    if (usedStrategies.has(route.strategy)) {
      issues.push(`${route.strategy} 전략이 중복되었습니다.`)
      continue
    }
    usedStrategies.add(route.strategy)

    const sequence = getRouteSequenceKey(route.placeIds)
    const composition = getRouteCompositionKey(route.placeIds)
    const actual = plan.routeCandidates.find(
      (candidate) => getRouteSequenceKey(candidate.placeIds) === sequence,
    )
    const pool = plan.selectionPools[route.strategy]
    const inPool = pool.some(
      (candidate) => getRouteSequenceKey(candidate.placeIds) === sequence,
    )

    if (!actual) {
      issues.push(`${routeIndex + 1}번째 코스가 서버 후보에 없습니다.`)
    } else if (!inPool) {
      issues.push(
        `${routeIndex + 1}번째 코스가 ${route.strategy} 전략의 Top-K 후보에 없습니다.`,
      )
    }

    if (
      outputCompositions.filter((value) => value === composition).length > 1
    ) {
      issues.push(`${routeIndex + 1}번째 코스의 장소 구성이 중복되었습니다.`)
    }
  }

  return issues
}
