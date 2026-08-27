import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import {
  courseGeneratorInputSchema,
  parseCourseGeneratorInput,
} from './course-generator-input.schema'

interface RawCourseGeneratorInput {
  startNodeId: string
  meetingType: string
  isWeekend: boolean
  qna?: { question: string; answer: string }[]
  visitOrder: string[]
  places: {
    id: string
    name: string
    category: string
    score: number
    tags?: string[]
  }[]
  distanceMatrix: {
    unit: string
    metric: string
    directed: boolean
    values: Record<string, Record<string, number>>
  }
  strategyConfig?: {
    balancedMaxDistanceRatio: number
    variationTopK?: number
    beamWidth?: number
    maxSearchStates?: number
  }
}

function validInput(): RawCourseGeneratorInput {
  return {
    startNodeId: 'start',
    meetingType: MeetingTypeCode.Social,
    isWeekend: false,
    visitOrder: [CategorySlug.Restaurant, CategorySlug.Cafe],
    places: [
      {
        id: 'p1',
        name: '장소A',
        category: CategorySlug.Restaurant,
        score: 3.5,
        tags: ['weekend_popular'],
      },
      {
        id: 'p2',
        name: '장소B',
        category: CategorySlug.Cafe,
        score: 4.2,
        tags: [],
      },
    ],
    distanceMatrix: {
      unit: 'meter',
      metric: 'walking_network_distance',
      directed: true,
      values: {
        start: { p1: 300 },
        p1: { p2: 250 },
      },
    },
  }
}

function isValid(input: unknown): boolean {
  return courseGeneratorInputSchema.safeParse(input).success
}

describe('courseGeneratorInputSchema', () => {
  describe('기본 케이스', () => {
    it('필수 필드만 있으면 통과하고 나머지는 기본값이 채워진다', () => {
      const parsed = courseGeneratorInputSchema.parse(validInput())

      expect(parsed.qna).toEqual([])
      expect(parsed.strategyConfig).toEqual({
        balancedMaxDistanceRatio: 1.2,
        variationTopK: 5,
        beamWidth: 500,
        maxSearchStates: 10_000,
      })
    })

    it('모든 필드를 채운 입력도 통과한다', () => {
      const input = {
        ...validInput(),
        qna: [{ question: '가장 중요한 목적은?', answer: '새로운 곳 경험' }],
        strategyConfig: {
          balancedMaxDistanceRatio: 1.5,
          variationTopK: 3,
          beamWidth: 100,
          maxSearchStates: 5_000,
        },
      }

      expect(isValid(input)).toBe(true)
    })
  })

  describe('startNodeId', () => {
    it('start가 아닌 값은 거부한다', () => {
      expect(isValid({ ...validInput(), startNodeId: 'end' })).toBe(false)
    })
  })

  describe('meetingType', () => {
    it.each(Object.values(MeetingTypeCode))(
      '%s는 유효한 모임 타입이다',
      (meetingType) => {
        expect(isValid({ ...validInput(), meetingType })).toBe(true)
      },
    )

    it('정의되지 않은 모임 타입은 거부한다', () => {
      expect(isValid({ ...validInput(), meetingType: 'UNKNOWN' })).toBe(false)
    })

    it('필드가 없으면 거부한다', () => {
      const { meetingType: _omit, ...rest } = validInput()
      expect(isValid(rest)).toBe(false)
    })
  })

  describe('isWeekend', () => {
    it('boolean이 아니면 거부한다', () => {
      expect(isValid({ ...validInput(), isWeekend: 'true' })).toBe(false)
    })

    it('필드가 없으면 거부한다', () => {
      const { isWeekend: _omit, ...rest } = validInput()
      expect(isValid(rest)).toBe(false)
    })
  })

  describe('qna', () => {
    it('필드를 생략하면 빈 배열로 채워진다', () => {
      const { qna: _omit, ...rest } = validInput()
      const parsed = courseGeneratorInputSchema.parse(rest)
      expect(parsed.qna).toEqual([])
    })

    it.each([0, 1, 2, 3])('%i개까지는 통과한다', (count) => {
      const qna = Array.from({ length: count }, (_, i) => ({
        question: `질문${i}`,
        answer: `답변${i}`,
      }))
      expect(isValid({ ...validInput(), qna })).toBe(true)
    })

    it('4개 이상이면 거부한다', () => {
      const qna = Array.from({ length: 4 }, (_, i) => ({
        question: `질문${i}`,
        answer: `답변${i}`,
      }))
      expect(isValid({ ...validInput(), qna })).toBe(false)
    })

    it('question이 빈 문자열이면 거부한다', () => {
      const input = {
        ...validInput(),
        qna: [{ question: '', answer: '답변' }],
      }
      expect(isValid(input)).toBe(false)
    })

    it('answer가 빈 문자열이면 거부한다', () => {
      const input = {
        ...validInput(),
        qna: [{ question: '질문', answer: '' }],
      }
      expect(isValid(input)).toBe(false)
    })

    it('question 또는 answer 중 하나만 있으면 거부한다', () => {
      expect(
        isValid({ ...validInput(), qna: [{ question: '질문만 있음' }] }),
      ).toBe(false)
      expect(
        isValid({ ...validInput(), qna: [{ answer: '답변만 있음' }] }),
      ).toBe(false)
    })

    it('정의되지 않은 필드가 있으면 거부한다', () => {
      const input = {
        ...validInput(),
        qna: [{ question: '질문', answer: '답변', extra: 'x' }],
      }
      expect(isValid(input)).toBe(false)
    })
  })

  describe('visitOrder', () => {
    it('빈 배열이면 거부한다', () => {
      expect(isValid({ ...validInput(), visitOrder: [] })).toBe(false)
    })

    it(`최대 ${MAX_COURSE_STEPS}개까지 허용한다`, () => {
      const visitOrder = Array.from(
        { length: MAX_COURSE_STEPS },
        () => CategorySlug.Restaurant,
      )
      const places = Array.from({ length: MAX_COURSE_STEPS }, (_, i) => ({
        id: `p${i}`,
        name: `장소${i}`,
        category: CategorySlug.Restaurant,
        score: 1,
        tags: [],
      }))
      expect(isValid({ ...validInput(), visitOrder, places })).toBe(true)
    })

    it(`${MAX_COURSE_STEPS + 1}개 이상이면 거부한다`, () => {
      const visitOrder = Array.from(
        { length: MAX_COURSE_STEPS + 1 },
        () => CategorySlug.Restaurant,
      )
      const places = Array.from({ length: MAX_COURSE_STEPS + 1 }, (_, i) => ({
        id: `p${i}`,
        name: `장소${i}`,
        category: CategorySlug.Restaurant,
        score: 1,
        tags: [],
      }))
      expect(isValid({ ...validInput(), visitOrder, places })).toBe(false)
    })

    it('CategorySlug에 없는 값은 거부한다', () => {
      expect(isValid({ ...validInput(), visitOrder: ['디저트'] })).toBe(false)
    })

    it('한글 카테고리 라벨은 더 이상 허용하지 않는다', () => {
      expect(isValid({ ...validInput(), visitOrder: ['식당'] })).toBe(false)
    })
  })

  describe('places', () => {
    it('category가 CategorySlug에 없으면 거부한다', () => {
      const input = validInput()
      input.places[0] = { ...input.places[0], category: '디저트' }
      expect(isValid(input)).toBe(false)
    })

    it('score가 NaN이면 거부한다', () => {
      const input = validInput()
      input.places[0] = { ...input.places[0], score: NaN }
      expect(isValid(input)).toBe(false)
    })

    it('score가 Infinity면 거부한다', () => {
      const input = validInput()
      input.places[0] = { ...input.places[0], score: Infinity }
      expect(isValid(input)).toBe(false)
    })

    it('score가 음수여도 통과한다 (하한 없음)', () => {
      const input = validInput()
      input.places[0] = { ...input.places[0], score: -5 }
      expect(isValid(input)).toBe(true)
    })

    it('tags를 생략하면 빈 배열로 채워진다', () => {
      const input = validInput()
      const { tags: _omit, ...placeWithoutTags } = input.places[0]
      input.places[0] = placeWithoutTags

      const parsed = courseGeneratorInputSchema.parse(input)
      expect(parsed.places[0].tags).toEqual([])
    })

    it('id가 빈 문자열이면 거부한다', () => {
      const input = validInput()
      input.places[0] = { ...input.places[0], id: '' }
      expect(isValid(input)).toBe(false)
    })

    it('id가 중복되면 거부한다', () => {
      const input = validInput()
      input.places[1] = { ...input.places[1], id: input.places[0].id }
      expect(isValid(input)).toBe(false)
    })

    it('장소 개수가 방문 순서 개수보다 적으면 거부한다', () => {
      const input = validInput()
      input.places = [input.places[0]]
      expect(isValid(input)).toBe(false)
    })

    it('장소 개수가 방문 순서 개수와 같으면 통과한다', () => {
      const input = validInput()
      expect(input.places).toHaveLength(input.visitOrder.length)
      expect(isValid(input)).toBe(true)
    })

    it('장소 개수가 방문 순서 개수보다 많으면 통과한다', () => {
      const input = validInput()
      input.places.push({
        id: 'p3',
        name: '장소C',
        category: CategorySlug.Cafe,
        score: 1,
        tags: [],
      })
      expect(isValid(input)).toBe(true)
    })

    it('places가 비어 있으면 거부한다 (방문 순서가 비어있지 않은 한)', () => {
      expect(isValid({ ...validInput(), places: [] })).toBe(false)
    })
  })

  describe('distanceMatrix', () => {
    it('unit이 meter가 아니면 거부한다', () => {
      const input = validInput()
      input.distanceMatrix.unit = 'km'
      expect(isValid(input)).toBe(false)
    })

    it('metric이 walking_network_distance가 아니면 거부한다', () => {
      const input = validInput()
      input.distanceMatrix.metric = 'straight_line'
      expect(isValid(input)).toBe(false)
    })

    it('directed가 false면 거부한다', () => {
      const input = validInput()
      input.distanceMatrix.directed = false
      expect(isValid(input)).toBe(false)
    })

    it('음수 거리는 거부한다', () => {
      const input = validInput()
      input.distanceMatrix.values.p1 = { p2: -1 }
      expect(isValid(input)).toBe(false)
    })

    it('0 거리는 통과한다 (같은 위치)', () => {
      const input = validInput()
      input.distanceMatrix.values.p1 = { p2: 0 }
      expect(isValid(input)).toBe(true)
    })

    it('무한대 거리는 거부한다', () => {
      const input = validInput()
      input.distanceMatrix.values.p1 = { p2: Infinity }
      expect(isValid(input)).toBe(false)
    })

    it('NaN 거리는 거부한다', () => {
      const input = validInput()
      input.distanceMatrix.values.p1 = { p2: NaN }
      expect(isValid(input)).toBe(false)
    })
  })

  describe('strategyConfig', () => {
    it('전체를 생략하면 기본값이 채워진다', () => {
      const parsed = courseGeneratorInputSchema.parse(validInput())
      expect(parsed.strategyConfig).toEqual({
        balancedMaxDistanceRatio: 1.2,
        variationTopK: 5,
        beamWidth: 500,
        maxSearchStates: 10_000,
      })
    })

    it('balancedMaxDistanceRatio만 주면 나머지는 기본값으로 채워진다', () => {
      const input = {
        ...validInput(),
        strategyConfig: { balancedMaxDistanceRatio: 2 },
      }
      const parsed = courseGeneratorInputSchema.parse(input)
      expect(parsed.strategyConfig).toEqual({
        balancedMaxDistanceRatio: 2,
        variationTopK: 5,
        beamWidth: 500,
        maxSearchStates: 10_000,
      })
    })

    it('balancedMaxDistanceRatio가 없으면 거부한다 (기본값 없음)', () => {
      const input = {
        ...validInput(),
        strategyConfig: { variationTopK: 5 },
      }
      expect(isValid(input)).toBe(false)
    })

    it('balancedMaxDistanceRatio가 0 이하면 거부한다', () => {
      const input = {
        ...validInput(),
        strategyConfig: { balancedMaxDistanceRatio: 0 },
      }
      expect(isValid(input)).toBe(false)
    })

    it.each([0, 51])(
      'variationTopK가 범위(1~50) 밖이면 거부한다: %i',
      (variationTopK) => {
        const input = {
          ...validInput(),
          strategyConfig: { balancedMaxDistanceRatio: 1.2, variationTopK },
        }
        expect(isValid(input)).toBe(false)
      },
    )

    it.each([0, 2_001])(
      'beamWidth가 범위(1~2000) 밖이면 거부한다: %i',
      (beamWidth) => {
        const input = {
          ...validInput(),
          strategyConfig: { balancedMaxDistanceRatio: 1.2, beamWidth },
        }
        expect(isValid(input)).toBe(false)
      },
    )

    it.each([0, 100_001])(
      'maxSearchStates가 범위(1~100000) 밖이면 거부한다: %i',
      (maxSearchStates) => {
        const input = {
          ...validInput(),
          strategyConfig: { balancedMaxDistanceRatio: 1.2, maxSearchStates },
        }
        expect(isValid(input)).toBe(false)
      },
    )

    it('variationTopK가 정수가 아니면 거부한다', () => {
      const input = {
        ...validInput(),
        strategyConfig: { balancedMaxDistanceRatio: 1.2, variationTopK: 5.5 },
      }
      expect(isValid(input)).toBe(false)
    })
  })

  describe('알 수 없는 최상위 필드', () => {
    it('정의되지 않은 필드가 있으면 거부한다', () => {
      expect(isValid({ ...validInput(), unknownField: 'x' })).toBe(false)
    })
  })

  describe('parseCourseGeneratorInput', () => {
    it('유효하지 않은 입력이면 예외를 던진다', () => {
      expect(() => parseCourseGeneratorInput({})).toThrow()
    })

    it('유효한 입력이면 파싱된 값을 반환한다', () => {
      const result = parseCourseGeneratorInput(validInput())
      expect(result.meetingType).toBe(MeetingTypeCode.Social)
      expect(result.isWeekend).toBe(false)
    })
  })
})
