import { BaseEntity } from 'src/common/entities/base.entity'
import { Place } from 'src/place/entities/place.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { MeetingType } from './meeting-type.entity'

@Entity()
export class Meeting extends BaseEntity {
  @ManyToOne(() => MeetingType, { nullable: false })
  @JoinColumn({ name: 'meeting_type_id' })
  meetingType: MeetingType

  @ManyToOne(() => Place, { nullable: false })
  @JoinColumn({ name: 'first_location_place_id' })
  firstLocationPlace: Place

  @Check(`length("name") >= 1`)
  @Column({ length: 10 })
  name: string

  @Column('date')
  date: string

  @Column('time')
  time: string

  @Column({ unique: true })
  accessToken: string

  @Column({ nullable: true, unique: true })
  courseImageKey: string

  @Column({ nullable: true })
  courseImageUploadedAt: Date
}
