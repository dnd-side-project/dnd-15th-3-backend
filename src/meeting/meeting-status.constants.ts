import { MeetingStatus } from './enums/meeting-status.enum'

export const MAP_PINS_AVAILABLE_STATUSES: readonly MeetingStatus[] = [
  MeetingStatus.RecommendationCollecting,
  MeetingStatus.CourseGenerating,
  MeetingStatus.CourseGenerationFailed,
]
