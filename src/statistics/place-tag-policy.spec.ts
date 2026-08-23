import { PlaceTagCode } from './enums/place-tag-code.enum'
import {
  type PlaceTagMetricSnapshot,
  shouldHavePlaceTag,
} from './place-tag-policy'

function createSnapshot(
  overrides: Partial<PlaceTagMetricSnapshot> = {},
): PlaceTagMetricSnapshot {
  return {
    placeId: '1',
    evaluationCount: 10,
    likeRatio: 0.7,
    dislikeRatio: 0.15,
    selectionCount: 5,
    globalRankPosition: 2,
    globalPopulationCount: 10,
    meetingPreferences: [],
    weekendPreference: null,
    weekdayPreference: null,
    categoryRanks: [],
    ...overrides,
  }
}

describe('shouldHavePlaceTag', () => {
  it('HIGH_PREFERENCE의 생성 70%, 제거 65% 히스테리시스를 적용한다', () => {
    expect(
      shouldHavePlaceTag(
        createSnapshot({ likeRatio: 0.7 }),
        PlaceTagCode.HighPreference,
        false,
      ),
    ).toBe(true)
    expect(
      shouldHavePlaceTag(
        createSnapshot({ likeRatio: 0.69 }),
        PlaceTagCode.HighPreference,
        false,
      ),
    ).toBe(false)
    expect(
      shouldHavePlaceTag(
        createSnapshot({ likeRatio: 0.65 }),
        PlaceTagCode.HighPreference,
        true,
      ),
    ).toBe(true)
    expect(
      shouldHavePlaceTag(
        createSnapshot({ likeRatio: 0.649 }),
        PlaceTagCode.HighPreference,
        true,
      ),
    ).toBe(false)
  })

  it('평가 10개 미만이면 새 평가 태그를 만들지 않고 기존 태그는 유지한다', () => {
    const snapshot = createSnapshot({ evaluationCount: 9, likeRatio: 0.9 })
    expect(
      shouldHavePlaceTag(snapshot, PlaceTagCode.HighPreference, false),
    ).toBe(false)
    expect(
      shouldHavePlaceTag(snapshot, PlaceTagCode.HighPreference, true),
    ).toBe(true)
  })

  it('SAFE_CHOICE의 생성 15%, 제거 20% 경계를 적용한다', () => {
    expect(
      shouldHavePlaceTag(
        createSnapshot({ dislikeRatio: 0.15 }),
        PlaceTagCode.SafeChoice,
        false,
      ),
    ).toBe(true)
    expect(
      shouldHavePlaceTag(
        createSnapshot({ dislikeRatio: 0.2 }),
        PlaceTagCode.SafeChoice,
        true,
      ),
    ).toBe(true)
    expect(
      shouldHavePlaceTag(
        createSnapshot({ dislikeRatio: 0.201 }),
        PlaceTagCode.SafeChoice,
        true,
      ),
    ).toBe(false)
  })

  it('세그먼트 태그의 표본 수·선택 수·30/25% 경계를 적용한다', () => {
    const creationMetric = {
      totalMeetingCount: 20,
      selectionCount: 6,
      selectionRatio: 0.3,
    }
    const retentionMetric = {
      totalMeetingCount: 20,
      selectionCount: 5,
      selectionRatio: 0.25,
    }
    expect(
      shouldHavePlaceTag(
        createSnapshot({ meetingPreferences: [creationMetric] }),
        PlaceTagCode.MeetingPreferred,
        false,
      ),
    ).toBe(true)
    expect(
      shouldHavePlaceTag(
        createSnapshot({ meetingPreferences: [retentionMetric] }),
        PlaceTagCode.MeetingPreferred,
        false,
      ),
    ).toBe(false)
    expect(
      shouldHavePlaceTag(
        createSnapshot({ meetingPreferences: [retentionMetric] }),
        PlaceTagCode.MeetingPreferred,
        true,
      ),
    ).toBe(true)
  })

  it('전체 및 카테고리 순위의 상위 20/30% 경계를 적용한다', () => {
    const snapshot = createSnapshot({
      globalRankPosition: 2,
      globalPopulationCount: 10,
      categoryRanks: [
        { selectionCount: 5, rankPosition: 2, populationCount: 10 },
      ],
    })
    expect(
      shouldHavePlaceTag(snapshot, PlaceTagCode.FrequentlySelected, false),
    ).toBe(true)
    expect(
      shouldHavePlaceTag(snapshot, PlaceTagCode.CategoryPopular, false),
    ).toBe(true)

    const third = createSnapshot({
      globalRankPosition: 3,
      globalPopulationCount: 10,
    })
    expect(
      shouldHavePlaceTag(third, PlaceTagCode.FrequentlySelected, false),
    ).toBe(false)
    expect(
      shouldHavePlaceTag(third, PlaceTagCode.FrequentlySelected, true),
    ).toBe(true)
  })

  it('원본 Fact에서 사라진 장소의 태그는 제거한다', () => {
    expect(
      shouldHavePlaceTag(undefined, PlaceTagCode.HighPreference, true),
    ).toBe(false)
  })
})
