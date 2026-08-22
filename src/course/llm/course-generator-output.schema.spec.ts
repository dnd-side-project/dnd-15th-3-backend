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
      // p7: 방문 순서상 Restaurant 자리에 쓰이지만 실제 category는 Cafe (거짓 응답 테스트용)
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
    name: '첫번째',
    places: [
      { placeId: 'p1', order: 1, category: CategorySlug.Restaurant },
      { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
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
        buildRoute({ routeId: 1, name: '첫번째' }),
        buildRoute({
          routeId: 2,
          name: '두번째',
          places: [
            { placeId: 'p3', order: 1, category: CategorySlug.Restaurant },
            { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
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
        buildRoute({ routeId: 1, name: '첫번째' }),
        buildRoute({
          routeId: 2,
          name: '두번째',
          places: [
            { placeId: 'p3', order: 1, category: CategorySlug.Restaurant },
            { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
          ],
        }),
        buildRoute({
          routeId: 3,
          name: '세번째',
          places: [
            { placeId: 'p9', order: 1, category: CategorySlug.Restaurant },
            { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
          ],
        }),
      ]
      expect(routes).toHaveLength(COURSE_STRATEGIES.length)
      expect(isValid(routes)).toBe(true)
    })

    it('4개 이상이면 거부한다', () => {
      const routes = [
        buildRoute({ routeId: 1, name: '첫번째' }),
        buildRoute({
          routeId: 2,
          name: '두번째',
          places: [
            { placeId: 'p3', order: 1, category: CategorySlug.Restaurant },
            { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
          ],
        }),
        buildRoute({
          routeId: 3,
          name: '세번째',
          places: [
            { placeId: 'p9', order: 1, category: CategorySlug.Restaurant },
            { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
          ],
        }),
        buildRoute({ routeId: 4, name: '네번째' }),
      ]
      expect(isValid(routes)).toBe(false)
    })

    it('expectedRouteCount가 지정되면 그 개수와 정확히 같아야 한다', () => {
      expect(isValid([buildRoute()], { expectedRouteCount: 1 })).toBe(true)
      expect(isValid([], { expectedRouteCount: 1 })).toBe(false)
      expect(
        isValid(
          [
            buildRoute({ routeId: 1, name: '첫번째' }),
            buildRoute({
              routeId: 2,
              name: '두번째',
              places: [
                { placeId: 'p3', order: 1, category: CategorySlug.Restaurant },
                { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
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
            places: [
              { placeId: 'p1', order: 1, category: CategorySlug.Restaurant },
            ],
          }),
        ]),
      ).toBe(false)
    })

    it('category가 visitOrder 순서와 다르면 거부한다', () => {
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p2', order: 1, category: CategorySlug.Cafe },
              { placeId: 'p1', order: 2, category: CategorySlug.Restaurant },
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
              { placeId: 'p1', order: 2, category: CategorySlug.Restaurant },
              { placeId: 'p2', order: 1, category: CategorySlug.Cafe },
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
              { placeId: 'ghost', order: 1, category: CategorySlug.Restaurant },
              { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
            ],
          }),
        ]),
      ).toBe(false)
    })

    it('실제 category와 출력 category가 다르면 거부한다', () => {
      // p7의 실제 category는 Cafe인데, Restaurant 자리에 놓고 category를 Restaurant라고 거짓 응답
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p7', order: 1, category: CategorySlug.Restaurant },
              { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
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
              { placeId: 'p5', order: 1, category: CategorySlug.Restaurant },
              { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
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
          buildRoute({ routeId: 1, name: '첫번째' }),
          buildRoute({
            routeId: 2,
            name: '두번째',
            places: [
              { placeId: 'p1', order: 1, category: CategorySlug.Restaurant },
              { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
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
          buildRoute({ routeId: 2, name: '첫번째' }),
          buildRoute({
            routeId: 3,
            name: '두번째',
            places: [
              { placeId: 'p3', order: 1, category: CategorySlug.Restaurant },
              { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })

  describe('코스 이름', () => {
    it('LLM은 접미사(코스)를 뺀 설명 부분만 입력하고, 서버가 자동으로 붙인다', () => {
      const result = createCourseGeneratorOutputSchema(
        buildInput(),
        STUB_PLAN,
      ).safeParse({ routes: [buildRoute({ name: '조용한 힐링' })] })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.routes[0].name).toBe('조용한 힐링 코스')
      }
    })

    it(`최소 길이(2자) 미만이면 거부한다`, () => {
      expect(isValid([buildRoute({ name: '짧' })])).toBe(false)
    })

    it('최대 길이(9자) 초과면 거부한다', () => {
      expect(isValid([buildRoute({ name: '가나다라마바사아자차' })])).toBe(
        false,
      )
    })

    it('공백만 있으면 거부한다', () => {
      expect(isValid([buildRoute({ name: '          ' })])).toBe(false)
    })

    it(`'코스'라는 글자가 포함되면 거부한다 (서버가 자동으로 붙이므로)`, () => {
      expect(isValid([buildRoute({ name: '이상한코스' })])).toBe(false)
    })

    it('서로 다른 코스의 이름이 중복되면 거부한다', () => {
      expect(
        isValid([
          buildRoute({ routeId: 1, name: '첫번째' }),
          buildRoute({
            routeId: 2,
            name: '첫번째',
            places: [
              { placeId: 'p3', order: 1, category: CategorySlug.Restaurant },
              { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
            ],
          }),
        ]),
      ).toBe(false)
    })

    it('앞뒤 공백 차이만 있는 이름도 중복으로 본다 (trim 후 접미사 부착)', () => {
      expect(
        isValid([
          buildRoute({ routeId: 1, name: '첫번째' }),
          buildRoute({
            routeId: 2,
            name: '첫번째 ',
            places: [
              { placeId: 'p3', order: 1, category: CategorySlug.Restaurant },
              { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })

  describe('category 필드 자체 검증', () => {
    it('CategorySlug에 없는 값이면 거부한다', () => {
      expect(
        isValid([
          buildRoute({
            places: [
              { placeId: 'p1', order: 1, category: 'dessert' },
              { placeId: 'p2', order: 2, category: CategorySlug.Cafe },
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
              { placeId: 'p1', order: 1, category: CategorySlug.Restaurant },
              { placeId: 'p1', order: 2, category: CategorySlug.Cafe },
            ],
          }),
        ]),
      ).toBe(false)
    })
  })
})
