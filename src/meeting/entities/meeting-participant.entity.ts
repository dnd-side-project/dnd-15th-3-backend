import { BaseEntity } from 'src/common/entities/base.entity'
import { User } from 'src/user/entities/user.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { ParticipantRole } from '../enums/participant-role.enum'
import { Meeting } from './meeting.entity'

@Entity()
@Unique(['meeting', 'user'])
export class MeetingParticipant extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'enum', enum: ParticipantRole })
  role: ParticipantRole

  @Check(`length("nickname") >= 1`)
  @Column({ length: 10 })
  nickname: string
}
