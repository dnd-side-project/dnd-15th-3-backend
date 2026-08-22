import { BaseEntity } from 'src/common/entities/base.entity'
import type { ErrorCode } from 'src/common/exception/error-code.type'
import { Check, Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm'
import {
  COURSE_CONFIRMABLE_STATUSES,
  COURSE_GENERATABLE_STATUSES,
} from '../constants/meeting-status.constants'
import { MeetingStatus } from '../enums/meeting-status.enum'
import { MeetingException } from '../exception/meeting.exception'
import { MeetingErrorCode } from '../exception/meeting-error-code'
import { MeetingLocation } from './meeting-location.entity'
import { MeetingType } from './meeting-type.entity'

@Entity()
@Check(`length("name") >= 1`)
export class Meeting extends BaseEntity {
  @ManyToOne(() => MeetingType, { nullable: false })
  @JoinColumn({ name: 'meeting_type_id' })
  meetingType: MeetingType

  @OneToOne(
    () => MeetingLocation,
    (meetingLocation) => meetingLocation.meeting,
  )
  meetingLocation: MeetingLocation

  @Column({ length: 10 })
  name: string

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.RecommendationCollecting,
  })
  status: MeetingStatus

  @Column('date')
  date: string

  @Column('time')
  time: string

  @Column({ unique: true })
  accessToken: string

  @Column({ name: 'course_version', default: 1 })
  courseVersion: number

  @Column({ type: 'varchar', nullable: true, unique: true })
  courseImageKey: string | null

  @Column({ type: 'timestamp', nullable: true })
  courseImageUploadedAt: Date | null

  isConfirmed(): boolean {
    return this.status === MeetingStatus.CourseConfirmed
  }

  confirm(): void {
    this.assertStatus(
      COURSE_CONFIRMABLE_STATUSES,
      MeetingErrorCode.courseNotConfirmable,
    )
    this.status = MeetingStatus.CourseConfirmed
  }

  startCourseGeneration(): void {
    this.assertStatus(
      [...COURSE_GENERATABLE_STATUSES, MeetingStatus.CourseGenerationFailed],
      MeetingErrorCode.courseNotGeneratable,
    )
    this.status = MeetingStatus.CourseGenerating
  }

  completeCourseGeneration(): void {
    this.assertStatus(
      [MeetingStatus.CourseGenerating],
      MeetingErrorCode.courseNotGeneratable,
    )
    this.status = MeetingStatus.CourseGenerated
  }

  failCourseGeneration(): void {
    this.assertStatus(
      [MeetingStatus.CourseGenerating],
      MeetingErrorCode.courseNotGeneratable,
    )
    this.status = MeetingStatus.CourseGenerationFailed
  }

  bumpCourseVersion(): void {
    this.courseVersion += 1
  }

  assertStatus(
    allowedStatuses: readonly MeetingStatus[],
    errorCode: ErrorCode,
  ): void {
    if (!allowedStatuses.includes(this.status)) {
      throw new MeetingException(errorCode)
    }
  }

  assertHasLocation(): void {
    if (!this.meetingLocation) {
      throw new MeetingException(MeetingErrorCode.meetingLocationDataMissing)
    }
  }
}
