import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import type { CourseRoutePlan } from './course-generator.planner'
import { COURSE_STRATEGIES } from './course-generator.planner'
import { parseCourseGeneratorInput } from './course-generator-input.schema'
import { createCourseGeneratorOutputSchema } from './course-generator-output.schema'

function buildInput() {
  return parseCourseGeneratorInput({
    startNodeId: 'start',
    meetingType: MeetingTypeCode.Social,
    isWeekend: false,
    visitOrder: [CategorySlug.Restaurant, CategorySlug.Cafe],
    places: [
      { id: 'p1', name: '장소A', category: CategorySlug.Restaurant, score: 3 },
      { id: 'p2', name: '장소B', category: CategorySlug.Cafe, score: 4 },
      { id: 'p3', name: '장소C', category: CategorySlug.Restaurant, score: 2 },
      // p5: start에서의 거리 데이터가 없음 (거리 연결성 실패 테스트용)
      { id: 'p5', name: '장소E', category: CategorySlug.Restaurant, score: 1 },
      // p7: 방문 순서상 Restaurant 자리에 쓰이지만 실제 category는 Cafe (잘못된 카테고리 배치 테스트용)
      { id: 'p7', name: '장소G', category: CategorySlug.Cafe, score: 1 },
      // p9: 세 번째 유효한 Restaurant 후보 (3개 코스 테스트용)
      { id: 'p9', name: '장소I', category: CategorySlug.Restaurant, score: 1 },
    ],
    distanceMatrix: {
      unit: 'meter',
      metric: 'walking_network_distance',
      directed: true,
      values: {
        start: { p1: 300, p3: 500, p7: 100, p9: 600 },
        p1: { p2: 250 },
        p3: { p2: 400 },
        p5: { p2: 999 },
        p7: { p2: 200 },
        p9: { p2: 350 },
      },
    },
  })
}

const STUB_PLAN: CourseRoutePlan = {
  stepCandidates: [],
  routeCandidates: [],
  selectionPools: {
    // biome-ignore lint/style/useNamingConvention: CourseStrategy 값과 동일하게 유지
    distance_minimization: [],
    // biome-ignore lint/style/useNamingConvention: CourseStrategy 값과 동일하게 유지
    preference_first: [],
    balanced: [],
  },
  selectedRoutes: [],
  balancedMaxDistanceRatio: 1.2,
  searchComplete: true,
}

function buildRoute(overrides: Record<string, unknown> = {}) {
  return {
    routeId: 1,
    places: [
      { placeId: 'p1', order: 1 },
      { placeId: 'p2', order: 2 },
    ],
    ...overrides,
  }
}

function isValid(
  routes: unknown[],
  options: { expectedRouteCount?: number } = {},
): boolean {
  const input = buildInput()
  return createCourseGeneratorOutputSchema(input, STUB_PLAN, options).safeParse(
    { routes },
  ).success
}

describe('createCourseGeneratorOutputSchema', () => {
  it('유효한 코스 1개는 통과한다', () => {
    expect(isValid([buildRoute()])).toBe(true)
  })

  it('장소 구성이 다른 유효한 코스 2개는 통과한다', () => {
    expect(
      isValid([
        buildRoute({ routeId: 1 }),
        buildRoute({
          routeId: 2,
          places: [
            { placeId: 'p3', order: 1 },
            { placeId: 'p2', order: 2 },
          ],
        }),
      ]),
    ).toBe(true)
  })

  describe('routes 개수', () => {
    it('0개면 거부한다', () => {
      expect(isValid([])).toBe(false)
    })

    it('COURSE_STRATEGIES 개수(3개)까지는 통과한다', () => {
      const routes = [
        buildRoute({ routeId: 1 }),
        buildRoute({
          routeId: 2,
          places: [
            { placeId: 'p3', order: 1 },
            { placeId: 'p2', order: 2 },
          ],
        }),
        buildRoute({
          routeId: 3,
          places: [
            { placeId: 'p9', order: 1 },
            { placeId: 'p2', order: 2 },
          ],
        }),
      ]
      expect(routes).toHaveLength(COURSE_STRATEGIES.length)
      expect(isValid(routes)).toBe(true)
    })

    it('4개 이상이면 거부한다', () => {
      const routes = [
        buildRoute({ routeId: 1 }),
        buildRoute({
          routeId: 2,
          places: [
            { placeId: 'p3', order: 1 },
            { placeId: 'p2', order: 2 },
          ],
        }),
        buildRoute({
          routeId: 3,
          places: [
            { placeId: 'p9', order: 1 },
            { placeId: 'p2', order: 2 },
          ],
        }),
        buildRoute({ routeId: 4 }),
      ]
      expect(isValid(routes)).toBe(false)
    })

    it('expectedRouteCount가 지정되면 그 개수와 정확히 같아야 한다', () => {
      expect(isValid([buildRoute()], { expectedRouteCount: 1 })).toBe(true)
      expect(isValid([], { expectedRouteCount: 1 })).toBe(false)
      expect(
        isValid(
          [
            buildRoute({ routeId: 1 }),
            buildRoute({
              routeId: 2,
              places: [
                { placeId: 'p3', order: 1 },
                { placeId: 'p2', order: 2 },
              ],
            }),
          ],
          { expectedRouteCount: 1 },
        ),
      ).toBe(false)
    })
  })

  describe('장소 개수·순서', () => {
    it('places 개수가 visitOrder 길이와 다르면 거부한다', () => {
      expect(
        isValid([
          buildRoute({
            places: [{ placeId: 'p1', order: 1 }],
          }),
        ]),
      ).toBe(false)
    })

    it('category가 visitOrder 순서와 다르면 거부한다', () => {
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p2', order: 1 },
              { placeId: 'p1', order: 2 },
            ],
          }),
        ]),
      ).toBe(false)
    })

    it('order가 순차적이지 않으면 거부한다', () => {
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p1', order: 2 },
              { placeId: 'p2', order: 1 },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })

  describe('환각·거짓 응답 방지', () => {
    it('후보 목록에 없는 placeId면 거부한다', () => {
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'ghost', order: 1 },
              { placeId: 'p2', order: 2 },
            ],
          }),
        ]),
      ).toBe(false)
    })

    it('placeId의 실제 category가 visitOrder와 다르면 거부한다', () => {
      // p7의 실제 category는 Cafe인데 Restaurant 자리(1번째)에 놓임.
      // LLM은 이제 category를 직접 낼 수 없으므로, 서버가 placeId로 조회한
      // 실제 category와 visitOrder를 비교해서 잡아낸다.
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p7', order: 1 },
              { placeId: 'p2', order: 2 },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })

  describe('물리적 유효성 (calculateRouteMetrics)', () => {
    it('거리 데이터가 연결되지 않으면 거부한다', () => {
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p5', order: 1 },
              { placeId: 'p2', order: 2 },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })

  describe('코스 간 중복 방지', () => {
    it('순서만 다르고 장소 구성이 같으면 거부한다', () => {
      expect(
        isValid([
          buildRoute({ routeId: 1 }),
          buildRoute({
            routeId: 2,
            places: [
              { placeId: 'p1', order: 1 },
              { placeId: 'p2', order: 2 },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })

  describe('routeId 순차성', () => {
    it('1부터 순차적이지 않으면 거부한다', () => {
      expect(
        isValid([
          buildRoute({ routeId: 2 }),
          buildRoute({
            routeId: 3,
            places: [
              { placeId: 'p3', order: 1 },
              { placeId: 'p2', order: 2 },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })

  describe('name 필드', () => {
    it('name 필드를 보내면 거부한다 (더 이상 LLM이 짓지 않음)', () => {
      expect(isValid([buildRoute({ name: '아무 이름' })])).toBe(false)
    })
  })

  describe('category 필드', () => {
    it('category 필드를 보내면 거부한다 (더 이상 LLM이 판단하지 않고 서버가 placeId로 조회함)', () => {
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p1', order: 1, category: 'restaurant' },
              { placeId: 'p2', order: 2 },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })

  describe('한 코스 내 장소 중복', () => {
    it('같은 placeId가 두 번 나오면 거부한다', () => {
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p1', order: 1 },
              { placeId: 'p1', order: 2 },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })
})
