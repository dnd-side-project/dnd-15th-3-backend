import { PlaceTagCode } from './enums/place-tag-code.enum'

export const PLACE_TAG_THRESHOLDS = {
  evaluationMinimum: 10,
  highPreferenceCreateRatio: 0.7,
  highPreferenceRemoveRatio: 0.65,
  safeChoiceCreateDislikeRatio: 0.15,
  safeChoiceRemoveDislikeRatio: 0.2,
  segmentMeetingMinimum: 20,
  segmentSelectionMinimum: 5,
  segmentCreateRatio: 0.3,
  segmentRetainRatio: 0.25,
  rankSelectionMinimum: 5,
  rankCreatePercentile: 0.2,
  rankRetainPercentile: 0.3,
} as const

export type SegmentPreferenceMetric = {
  totalMeetingCount: number
  selectionCount: number
  selectionRatio: number
}

export type RankPreferenceMetric = {
  selectionCount: number
  rankPosition: number
  populationCount: number
}

export type PlaceTagMetricSnapshot = {
  placeId: string
  evaluationCount: number
  likeRatio: number
  dislikeRatio: number
  selectionCount: number
  globalRankPosition: number
  globalPopulationCount: number
  meetingPreferences: SegmentPreferenceMetric[]
  weekendPreference: SegmentPreferenceMetric | null
  weekdayPreference: SegmentPreferenceMetric | null
  categoryRanks: RankPreferenceMetric[]
}

function shouldHaveSegmentTag(
  metrics: SegmentPreferenceMetric[],
  currentlyTagged: boolean,
): boolean {
  if (currentlyTagged) {
    return metrics.some(
      (metric) =>
        metric.totalMeetingCount >=
          PLACE_TAG_THRESHOLDS.segmentMeetingMinimum &&
        metric.selectionRatio >= PLACE_TAG_THRESHOLDS.segmentRetainRatio,
    )
  }

  return metrics.some(
    (metric) =>
      metric.totalMeetingCount >= PLACE_TAG_THRESHOLDS.segmentMeetingMinimum &&
      metric.selectionCount >= PLACE_TAG_THRESHOLDS.segmentSelectionMinimum &&
      metric.selectionRatio >= PLACE_TAG_THRESHOLDS.segmentCreateRatio,
  )
}

function shouldHaveRankTag(
  metrics: RankPreferenceMetric[],
  currentlyTagged: boolean,
): boolean {
  if (currentlyTagged) {
    return metrics.some(
      (metric) =>
        metric.rankPosition <=
        Math.max(
          1,
          Math.ceil(
            metric.populationCount * PLACE_TAG_THRESHOLDS.rankRetainPercentile,
          ),
        ),
    )
  }

  return metrics.some(
    (metric) =>
      metric.selectionCount >= PLACE_TAG_THRESHOLDS.rankSelectionMinimum &&
      metric.rankPosition <=
        Math.max(
          1,
          Math.ceil(
            metric.populationCount * PLACE_TAG_THRESHOLDS.rankCreatePercentile,
          ),
        ),
  )
}

export function shouldHavePlaceTag(
  snapshot: PlaceTagMetricSnapshot | undefined,
  tagCode: PlaceTagCode,
  currentlyTagged: boolean,
): boolean {
  // 원본 Fact에서 완전히 사라진 장소의 파생 태그는 재구성 시 제거한다.
  if (!snapshot) return false

  switch (tagCode) {
    case PlaceTagCode.HighPreference:
      if (!currentlyTagged) {
        return (
          snapshot.evaluationCount >= PLACE_TAG_THRESHOLDS.evaluationMinimum &&
          snapshot.likeRatio >= PLACE_TAG_THRESHOLDS.highPreferenceCreateRatio
        )
      }
      return !(
        snapshot.evaluationCount >= PLACE_TAG_THRESHOLDS.evaluationMinimum &&
        snapshot.likeRatio < PLACE_TAG_THRESHOLDS.highPreferenceRemoveRatio
      )

    case PlaceTagCode.SafeChoice:
      if (!currentlyTagged) {
        return (
          snapshot.evaluationCount >= PLACE_TAG_THRESHOLDS.evaluationMinimum &&
          snapshot.dislikeRatio <=
            PLACE_TAG_THRESHOLDS.safeChoiceCreateDislikeRatio
        )
      }
      return !(
        snapshot.evaluationCount >= PLACE_TAG_THRESHOLDS.evaluationMinimum &&
        snapshot.dislikeRatio >
          PLACE_TAG_THRESHOLDS.safeChoiceRemoveDislikeRatio
      )

    case PlaceTagCode.MeetingPreferred:
      return shouldHaveSegmentTag(snapshot.meetingPreferences, currentlyTagged)

    case PlaceTagCode.WeekendPreferred:
      return shouldHaveSegmentTag(
        snapshot.weekendPreference ? [snapshot.weekendPreference] : [],
        currentlyTagged,
      )

    case PlaceTagCode.WeekdayPreferred:
      return shouldHaveSegmentTag(
        snapshot.weekdayPreference ? [snapshot.weekdayPreference] : [],
        currentlyTagged,
      )

    case PlaceTagCode.FrequentlySelected:
      return shouldHaveRankTag(
        [
          {
            selectionCount: snapshot.selectionCount,
            rankPosition: snapshot.globalRankPosition,
            populationCount: snapshot.globalPopulationCount,
          },
        ],
        currentlyTagged,
      )

    case PlaceTagCode.CategoryPopular:
      return shouldHaveRankTag(snapshot.categoryRanks, currentlyTagged)
  }
}
