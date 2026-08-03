import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Place } from 'src/place/entities/place.entity'
import { Entity, Index, JoinColumn, ManyToOne } from 'typeorm'

@Entity()
@Index(['meeting', 'place'], { unique: true })
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
}
