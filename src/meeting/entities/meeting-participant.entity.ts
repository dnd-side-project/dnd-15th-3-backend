import { BaseEntity } from 'src/common/entities/base.entity'
import { User } from 'src/user/entities/user.entity'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { ParticipantRole } from '../enums/participant-role.enum'
import { Meeting } from './meeting.entity'

@Entity()
@Unique(['meeting', 'user'])
@Unique(['meeting', 'nickname'])
@Check(`length("access_token") >= 1`)
@Check(`length("nickname") >= 1`)
export class MeetingParticipant extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'enum', enum: ParticipantRole })
  role: ParticipantRole

  @Column({
    length: 255,
    unique: true,
    comment: 'Participant-scoped session token',
  })
  accessToken: string

  @Column({ length: 10 })
  nickname: string

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Selected profile avatar identifier for this meeting',
  })
  profileAvatarId: ProfileAvatarId
}
