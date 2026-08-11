import { MeetingStatus } from '../enums/meeting-status.enum'

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
