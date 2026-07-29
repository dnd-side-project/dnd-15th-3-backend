import { BaseEntity } from 'src/common/entities/base.entity'
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm'
import { ReviewSource } from '../enums/review-source.enum'
import { Place } from './place.entity'

@Entity()
export class PlaceReviewSummary extends BaseEntity {
  @OneToOne(() => Place, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place: Place

  @Column('text')
  summaryText: string

  @Column({ type: 'enum', enum: ReviewSource })
  source: ReviewSource

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  crawledAt: Date
}
