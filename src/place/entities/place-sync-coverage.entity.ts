import { Category } from 'src/category/entities/category.entity'
import { BaseEntity } from 'src/common/entities/base.entity'
import type { Polygon } from 'typeorm'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { PlaceSource } from '../enums/place-source.enum'

@Entity()
@Index(['source', 'category', 'tileKey'], { unique: true })
export class PlaceSyncCoverage extends BaseEntity {
  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Column({ type: 'enum', enum: PlaceSource })
  source: PlaceSource

  @Column({ name: 'tile_key', length: 100 })
  tileKey: string

  @Column('geography', { spatialFeatureType: 'Polygon', srid: 4326 })
  coverage: Polygon

  @Column({ name: 'last_synced_at', default: () => 'CURRENT_TIMESTAMP' })
  lastSyncedAt: Date
}
