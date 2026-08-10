import { Category } from 'src/category/entities/category.entity'
import { BaseEntity } from 'src/common/entities/base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { PlaceSource } from '../enums/place-source.enum'

@Entity()
@Index(['source', 'category', 'tileKey'], { unique: true })
export class PlaceSyncTileLease extends BaseEntity {
  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Column({ type: 'enum', enum: PlaceSource })
  source: PlaceSource

  @Column({ name: 'tile_key', length: 100 })
  tileKey: string

  @Column({ name: 'owner_token', length: 64 })
  ownerToken: string

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date
}
