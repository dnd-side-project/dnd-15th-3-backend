import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildCourseRoutePlan,
  CoursePlanningError,
  calculateRouteMetrics,
} from './course-generator.planner'
import type { CourseFeedbackInterpretation } from './course-generator-feedback'
import { parseCourseGeneratorInput } from './course-generator-input.schema'

const fixturesDir = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'promptfoo',
  'fixtures',
)

function loadInputFixture(name: string) {
  const raw = readFileSync(resolve(fixturesDir, `${name}.json`), 'utf8')
  return parseCourseGeneratorInput(JSON.parse(raw))
}

describe('course route planner', () => {
  it('generates valid routes and selects each strategy on the server', () => {
    const input = loadInputFixture('input-normal')
    const plan = buildCourseRoutePlan(input)

    expect(plan.routeCandidates.length).toBeGreaterThan(1)
    expect(
      plan.selectedRoutes.map((route) => [route.strategy, route.placeIds]),
    ).toEqual([
      ['distance_minimization', ['1', '4', '8', '7', '10']],
      ['preference_first', ['2', '3', '5', '6', '9']],
      ['balanced', ['1', '4', '5', '6', '9']],
    ])
    expect(
      plan.selectionPools.distance_minimization.length,
    ).toBeLessThanOrEqual(input.strategyConfig.variationTopK)
  })

  it('recalculates route distance and score from server data', () => {
    const input = loadInputFixture('input-normal')
    const metrics = calculateRouteMetrics(['1', '4', '5', '6', '9'], input)

    expect(metrics).toEqual({
      placeIds: ['1', '4', '5', '6', '9'],
      totalDistanceMeters: 6,
      totalScore: 14.5,
    })
  })

  it('returns only one strategy when only one valid composition exists', () => {
    const input = loadInputFixture('input-category-tight')
    const plan = buildCourseRoutePlan(input)

    expect(plan.routeCandidates).toHaveLength(2)
    expect(plan.selectedRoutes).toHaveLength(1)
  })

  it('rejects repeated categories without enough distinct places', () => {
    const input = loadInputFixture('input-category-tight')
    input.places.pop()

    expect(() => buildCourseRoutePlan(input)).toThrow(CoursePlanningError)
  })

  it('rejects inputs with no valid distance transition', () => {
    const input = loadInputFixture('input-normal')
    input.distanceMatrix.values.start = {}

    expect(() => buildCourseRoutePlan(input)).toThrow(CoursePlanningError)
  })

  it('filters hard feedback constraints before building strategy pools', () => {
    const input = loadInputFixture('input-normal')
    const feedback: CourseFeedbackInterpretation = {
      constraints: [
        {
          kind: 'exclude',
          target: 'place',
          values: ['10'],
          strength: 'hard',
          weight: 1,
          commentIds: ['comment-1'],
        },
      ],
      unresolved: [],
    }

    const plan = buildCourseRoutePlan(input, {
      feedback,
      targetStrategy: 'distance_minimization',
    })

    expect(plan.routeCandidates).not.toHaveLength(0)
    expect(
      plan.routeCandidates.every((route) => !route.placeIds.includes('10')),
    ).toBe(true)
  })
})
