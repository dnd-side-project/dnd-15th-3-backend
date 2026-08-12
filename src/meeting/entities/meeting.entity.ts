import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm'
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
}
