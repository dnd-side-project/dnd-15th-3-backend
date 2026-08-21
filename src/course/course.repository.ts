import { Injectable } from '@nestjs/common'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import type { EntityManager } from 'typeorm'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseCategoryStep } from './entities/course-category-step.entity'

@Injectable()
export class CourseRepository {
  lockMeeting(
    manager: EntityManager,
    meetingId: string,
  ): Promise<Meeting | null> {
    return manager
      .getRepository(Meeting)
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.meetingType', 'meetingType')
      .where('meeting.id = :meetingId', { meetingId })
      .setLock('pessimistic_write')
      .getOne()
  }

  async deleteCourseCategorySteps(
    manager: EntityManager,
    meetingId: string,
  ): Promise<void> {
    await manager
      .getRepository(CourseCategoryStep)
      .createQueryBuilder()
      .delete()
      .from(CourseCategoryStep)
      .where('meeting_id = :meetingId', { meetingId })
      .execute()
  }

  async deleteCourseCandidatePlaces(
    manager: EntityManager,
    courseCandidateId: string,
  ): Promise<void> {
    await manager
      .getRepository(CourseCandidatePlace)
      .createQueryBuilder()
      .delete()
      .from(CourseCandidatePlace)
      .where('course_candidate_id = :courseCandidateId', { courseCandidateId })
      .execute()
  }

  countParticipants(
    manager: EntityManager,
    meetingId: string,
  ): Promise<number> {
    return manager
      .getRepository(MeetingParticipant)
      .count({ where: { meeting: { id: meetingId } } })
  }
}
