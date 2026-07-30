import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Place } from 'src/place/entities/place.entity'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'

@Entity()
export class MeetingPlaceRecommendation extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @ManyToOne(() => Place, { nullable: false })
  @JoinColumn({ name: 'place_id' })
  place: Place

  @ManyToOne(() => MeetingParticipant, { nullable: false })
  @JoinColumn({ name: 'recommended_by' })
  recommendedBy: MeetingParticipant

  @Column({ default: 0 })
  likeCount: number

  @Column({ default: 0 })
  dislikeCount: number
}
