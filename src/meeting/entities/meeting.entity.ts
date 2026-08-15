import { ConflictException, InternalServerErrorException } from '@nestjs/common'
import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm'
import { COURSE_CONFIRMABLE_STATUSES } from '../constants/meeting-status.constants'
import { MeetingStatus } from '../enums/meeting-status.enum'
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

  @Column({ nullable: true, unique: true })
  courseImageKey: string

  @Column({ nullable: true })
  courseImageUploadedAt: Date

  isConfirmed(): boolean {
    return this.status === MeetingStatus.CourseConfirmed
  }

  confirm(): void {
    this.assertStatus(
      COURSE_CONFIRMABLE_STATUSES,
      '모임이 코스 생성 완료 상태가 아니어서 코스를 확정할 수 없습니다.',
    )
    this.status = MeetingStatus.CourseConfirmed
  }

  setCourseImage(courseImageKey: string): void {
    this.courseImageKey = courseImageKey
    this.courseImageUploadedAt = new Date()
  }

  bumpCourseVersion(): void {
    this.courseVersion += 1
  }

  assertStatus(
    allowedStatuses: readonly MeetingStatus[],
    message: string,
  ): void {
    if (!allowedStatuses.includes(this.status)) {
      throw new ConflictException(message)
    }
  }

  assertHasLocation(): void {
    if (!this.meetingLocation) {
      throw new InternalServerErrorException(
        '모임은 존재하지만 시작지 정보를 찾을 수 없는 데이터 정합성 오류입니다.',
      )
    }
  }
}
