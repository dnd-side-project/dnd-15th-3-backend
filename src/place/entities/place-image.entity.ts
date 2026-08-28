import { BaseEntity } from 'src/common/entities/base.entity'
import { MediaAsset } from 'src/common/entities/media-asset.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import type { PlacePhotoAttribution } from '../photo/place-photo.types'
import { Place } from './place.entity'

@Entity()
@Index(['place'], { unique: true, where: '"is_primary" = true' })
@Index(['place', 'displayOrder'], { unique: true })
export class PlaceImage extends BaseEntity {
  @ManyToOne(() => Place, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place: Place

  @ManyToOne(() => MediaAsset, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'media_asset_id' })
  mediaAsset: MediaAsset

  @Column('int')
  displayOrder: number

  @Column({ default: false })
  isPrimary: boolean

  @Column({
    type: 'enum',
    enum: PlacePhotoSource,
    default: PlacePhotoSource.Owned,
  })
  source: PlacePhotoSource

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  attributions: PlacePhotoAttribution[]
}
