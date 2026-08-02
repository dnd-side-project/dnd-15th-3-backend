import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CourseGeneratorValidationError,
  parseCourseGeneratorOutput,
} from './course-generator.validator'
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

function loadExpectedOutput(name: string) {
  return readFileSync(resolve(fixturesDir, `${name}.expected.json`), 'utf8')
}

function expectValidationError(fn: () => unknown, message: string) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(CourseGeneratorValidationError)
    const validationError = error as CourseGeneratorValidationError
    expect(validationError.issues.join(' / ')).toContain(message)
    return
  }
  throw new Error('검증이 실패하지 않았습니다.')
}

describe('parseCourseGeneratorOutput', () => {
  const input = loadInputFixture('input-normal')

  it('유효한 LLM 출력을 통과시킨다', () => {
    const output = parseCourseGeneratorOutput(
      loadExpectedOutput('input-normal'),
      input,
    )

    expect(output.routes).toHaveLength(3)
    expect(output.routes[0].places.map((place) => place.category)).toEqual(
      input.visitOrder,
    )
  })

  it('카테고리 촉박 케이스(후보 5개)의 유효 출력을 통과시킨다', () => {
    const tightInput = loadInputFixture('input-category-tight')
    const output = parseCourseGeneratorOutput(
      loadExpectedOutput('input-category-tight'),
      tightInput,
    )

    expect(output.routes).toHaveLength(1)
  })

  it('긴 동선 케이스(7단계)의 유효 출력을 통과시킨다', () => {
    const longInput = loadInputFixture('input-long-visit-order')
    const output = parseCourseGeneratorOutput(
      loadExpectedOutput('input-long-visit-order'),
      longInput,
    )

    expect(output.routes).toHaveLength(3)
  })

  it('카테고리 순서가 visitOrder와 다르면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[0].places[1].category = '액티비티'

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      '카테고리가',
    )
  })

  it('후보 목록에 없는 placeId(환각)가 있으면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[0].places[0].placeId = '999'

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      'placeId 999는 후보 목록에 존재하지 않습니다',
    )
  })

  it('한 코스 내에 중복 placeId가 있으면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[0].places[1].placeId = output.routes[0].places[0].placeId

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      '중복된 장소',
    )
  })

  it('서로 다른 코스의 장소 구성이 동일하면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[1].places = output.routes[0].places

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      '장소 구성이 동일합니다',
    )
  })

  it('places에 불필요한 필드(위도/경도 등)가 있으면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[0].places[0].latitude = 35.87

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      '',
    )
  })

  it('routes가 3개를 초과하면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes.push(output.routes[2])

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      '1개 이상 3개 이하',
    )
  })

  it('places 개수가 visitOrder와 일치하지 않으면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[0].places.pop()

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      '개수(4)가 visitOrder(5)',
    )
  })

  it('order가 순차적이지 않으면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[0].places[2].order = 9

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      'order가 순차적이지 않습니다',
    )
  })

  it('strategy가 중복되면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[1].strategy = output.routes[0].strategy

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      '전략(strategy)은 서로 달라야',
    )
  })

  it('routeId가 순차적이지 않으면 실패한다', () => {
    const output = JSON.parse(loadExpectedOutput('input-normal'))
    output.routes[0].routeId = 5

    expectValidationError(
      () => parseCourseGeneratorOutput(JSON.stringify(output), input),
      'routeId는 1부터 순차적',
    )
  })

  it('JSON이 아닌 출력이면 실패한다', () => {
    expect(() =>
      parseCourseGeneratorOutput('이건 JSON이 아닙니다', input),
    ).toThrow(CourseGeneratorValidationError)
  })
})
