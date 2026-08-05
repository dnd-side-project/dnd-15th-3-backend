import { BaseEntity } from 'src/common/entities/base.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { PreferenceType } from '../enums/preference-type.enum'
import { MeetingPlaceRecommendation } from './meeting-place-recommendation.entity'

@Entity()
@Index(['recommendation', 'participant'], { unique: true })
export class MeetingPlaceRecommendationVote extends BaseEntity {
  @ManyToOne(() => MeetingPlaceRecommendation, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recommendation_id' })
  recommendation: MeetingPlaceRecommendation

  @ManyToOne(() => MeetingParticipant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: MeetingParticipant

  @Column({ type: 'enum', enum: PreferenceType })
  preference: PreferenceType
}
