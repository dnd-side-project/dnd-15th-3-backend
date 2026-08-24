import { BaseEntity } from 'src/common/entities/base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { PlacePhotoMatchStatus } from '../enums/place-photo-match-status.enum'
import { PlaceSource } from '../enums/place-source.enum'
import { Place } from './place.entity'

@Entity()
@Index('IDX_place_photo_match_place_provider', ['place', 'provider'], {
  unique: true,
})
@Index('IDX_place_photo_match_expiry', ['expiresAt'])
export class PlacePhotoMatch extends BaseEntity {
  @ManyToOne(() => Place, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'place_id',
    foreignKeyConstraintName: 'FK_place_photo_match_place',
  })
  place: Place

  @Column({ type: 'enum', enum: PlaceSource })
  provider: PlaceSource

  @Column({
    type: 'varchar',
    name: 'provider_place_id',
    length: 255,
    nullable: true,
  })
  providerPlaceId: string | null

  @Column({ type: 'enum', enum: PlacePhotoMatchStatus })
  status: PlacePhotoMatchStatus

  @Column({ type: 'float', nullable: true })
  confidence: number | null

  @Column({ type: 'timestamp', name: 'checked_at' })
  checkedAt: Date

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date
}
