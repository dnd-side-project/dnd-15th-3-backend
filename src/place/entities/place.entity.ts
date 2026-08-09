import { Category } from 'src/category/entities/category.entity'
import { BaseEntity } from 'src/common/entities/base.entity'
import type { Point } from 'typeorm'
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { PlaceSource } from '../enums/place-source.enum'

@Entity()
@Check(`length("name") >= 1`)
@Check(`length("address") >= 1`)
@Check(`"latitude" BETWEEN -90 AND 90`)
@Check(`"longitude" BETWEEN -180 AND 180`)
export class Place extends BaseEntity {
  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Column({ length: 100 })
  name: string

  @Column({ length: 255 })
  address: string

  @Column('float')
  latitude: number

  @Column('float')
  longitude: number

  @Column({ type: 'enum', enum: PlaceSource })
  source: PlaceSource

  @Column({
    type: 'varchar',
    name: 'provider_place_id',
    length: 255,
    nullable: true,
  })
  providerPlaceId: string | null

  @Column({
    type: 'varchar',
    name: 'place_url',
    length: 500,
    nullable: true,
  })
  placeUrl: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null

  @Column({
    type: 'varchar',
    name: 'road_address',
    length: 255,
    nullable: true,
  })
  roadAddress: string | null

  @Column({
    type: 'varchar',
    name: 'provider_category_code',
    length: 100,
    nullable: true,
  })
  providerCategoryCode: string | null

  @Column({ type: 'timestamp', name: 'last_synced_at', nullable: true })
  lastSyncedAt: Date | null

  @Column('varchar', { length: 100, nullable: true })
  previewUrl: string | null

  @Index('IDX_place_location', { spatial: true, type: 'gist' })
  @Column('geography', { spatialFeatureType: 'Point', srid: 4326 })
  location: Point
}
