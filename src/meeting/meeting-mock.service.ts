import { Injectable } from '@nestjs/common'
import { MockApiService } from 'src/mock/mock-api.service'
import { MeetingStatus } from './enums/meeting-status.enum'

const MEETING_STATUSES: Record<string, MeetingStatus> = {
  '1': MeetingStatus.RecommendationCollecting,
  '2': MeetingStatus.CourseGenerating,
  '3': MeetingStatus.CourseGenerated,
  '4': MeetingStatus.CourseGenerationFailed,
  '5': MeetingStatus.CourseConfirmed,
}

@Injectable()
export class MeetingMockService {
  constructor(private readonly mockApiService: MockApiService) {}

  getMeetingStatus(meetingId: string): MeetingStatus | 'NOT_FOUND' {
    this.mockApiService.requireEnabled()
    return MEETING_STATUSES[meetingId] ?? 'NOT_FOUND'
  }
}
