import { getMetadataArgsStorage } from 'typeorm'
import { PlaceSelectionFact } from './place-selection-fact.stats-entity'

describe('PlaceSelectionFact entity', () => {
  it('outbox_event_id, place_id가 복합 PK다', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === PlaceSelectionFact,
    )
    const primaryKeyProperties = columns
      .filter((column) => column.options.primary)
      .map((column) => column.propertyName)
      .sort()

    expect(primaryKeyProperties).toEqual(['outboxEventId', 'placeId'].sort())
  })

  it('meetingTime이 초 단위 정밀도로 등록된다', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === PlaceSelectionFact,
    )
    const optionsByProperty = new Map(
      columns.map((column) => [column.propertyName, column.options]),
    )

    expect(optionsByProperty.get('meetingTime')).toMatchObject({
      type: 'time',
      precision: 0,
    })
  })

  it('의도한 CHECK 제약 조건이 모두 등록된다', () => {
    const expressions = getMetadataArgsStorage()
      .checks.filter((check) => check.target === PlaceSelectionFact)
      .map((check) => check.expression)
      .sort()

    expect(expressions).toEqual(
      [
        `"outbox_event_id" > 0`,
        `"place_id" > 0`,
        `"place_category_id" > 0`,
        `"meeting_id" > 0`,
        `"meeting_type_id" > 0`,
        `"course_version" >= 1`,
        `"participant_count" >= 1`,
        `"like_count" >= 0`,
        `"dislike_count" >= 0`,
        `"like_count" + "dislike_count" <= "participant_count"`,
        `("course_generation_run_id" IS NULL AND "course_generation_customization_type" IS NULL AND "course_generation_input_hash" IS NULL) OR ("course_generation_run_id" IS NOT NULL AND "course_generation_customization_type" IS NOT NULL AND "course_generation_input_hash" IS NOT NULL)`,
        `"course_generation_run_id" IS NULL OR "course_generation_run_id" > 0`,
        `"course_generation_customization_type" IS NULL OR "course_generation_customization_type" IN ('SKIP', 'QUESTIONNAIRE')`,
        `"course_generation_input_hash" IS NULL OR length("course_generation_input_hash") = 64`,
      ].sort(),
    )
  })

  it('최신 courseVersion 필터링용 인덱스가 meetingId, courseVersion 순서로 걸려있다', () => {
    const indices = getMetadataArgsStorage().indices.filter(
      (index) => index.target === PlaceSelectionFact,
    )

    expect(indices.map((index) => index.columns)).toEqual(
      expect.arrayContaining([['meetingId', 'courseVersion']]),
    )
  })

  it('createdAt이 생성 시각 컬럼으로 등록된다', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === PlaceSelectionFact,
    )
    const createdAtColumn = columns.find(
      (column) => column.propertyName === 'createdAt',
    )

    expect(createdAtColumn?.mode).toBe('createDate')
  })

  it('updatedAt이 수정 시각 컬럼으로 등록된다', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === PlaceSelectionFact,
    )
    const updatedAtColumn = columns.find(
      (column) => column.propertyName === 'updatedAt',
    )

    expect(updatedAtColumn?.mode).toBe('updateDate')
  })
})
