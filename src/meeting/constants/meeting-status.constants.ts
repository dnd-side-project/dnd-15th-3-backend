import { MeetingStatus } from '../enums/meeting-status.enum'

export const MEETING_DETAILS_EDITABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
]

export const MAP_PINS_VISIBLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
  MeetingStatus.CourseGenerating,
  MeetingStatus.CourseGenerationFailed,
]

export const PLACE_PREFERENCE_EDITABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
  MeetingStatus.CourseGenerated,
  MeetingStatus.CourseGenerationFailed,
]

export const COURSE_CANDIDATES_VISIBLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.CourseGenerated,
]

export const COURSE_COMMENTS_VISIBLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.CourseGenerated,
]

export const COURSE_DETAIL_VISIBLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.CourseGenerated,
  MeetingStatus.CourseConfirmed,
]

export const COURSE_COMMENT_CREATABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.CourseGenerated,
]

export const COURSE_CONFIRMABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.CourseGenerated,
]

export const COURSE_GENERATABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
]

export const MEETING_LOCATION_EDITABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
  MeetingStatus.CourseGenerated,
  MeetingStatus.CourseGenerationFailed,
  MeetingStatus.CourseConfirmed,
]

export const RECOMMENDATION_ADDABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
  MeetingStatus.CourseGenerated,
  MeetingStatus.CourseGenerationFailed,
]

export const COURSE_PLAN_EDITABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
  MeetingStatus.CourseGenerated,
  MeetingStatus.CourseGenerationFailed,
]

export const COURSE_PLACE_ADDABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.CourseGenerated,
]

export const COURSE_PLACES_REPLACEABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.CourseGenerated,
]

export const SIMILAR_PLACES_RECOMMENDABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
  MeetingStatus.CourseGenerating,
  MeetingStatus.CourseGenerated,
  MeetingStatus.CourseGenerationFailed,
]
