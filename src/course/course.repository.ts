import { Injectable } from '@nestjs/common'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import type { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseCategoryStep } from './entities/course-category-step.entity'

@Injectable()
export class CourseRepository {
  async lockMeeting(
    manager: EntityManager,
    meetingId: string,
  ): Promise<Meeting | null> {
    // PostgreSQL은 outer join의 nullable한 쪽에 FOR UPDATE를 거는 것을 거부하므로,
    // meeting과 meetingLocation을 조인 없이 각각 단일 테이블로 잠근다.
    const meeting = await this.lockRowById(
      manager,
      Meeting,
      'meeting',
      meetingId,
    )
    if (!meeting) return null

    const meetingLocation = await this.lockRowById(
      manager,
      MeetingLocation,
      'location',
      meetingId,
      'meeting_id',
    )
    const meetingWithType = await manager.getRepository(Meeting).findOne({
      where: { id: meetingId },
      relations: { meetingType: true },
    })
    if (!meetingWithType) return null

    Object.assign(meeting, {
      meetingLocation,
      meetingType: meetingWithType.meetingType,
    })
    return meeting
  }

  private lockRowById<T extends ObjectLiteral>(
    manager: EntityManager,
    entity: EntityTarget<T>,
    alias: string,
    id: string,
    idColumn = 'id',
  ): Promise<T | null> {
    return manager
      .getRepository(entity)
      .createQueryBuilder(alias)
      .where(`${alias}.${idColumn} = :id`, { id })
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
