import { Category } from 'src/category/entities/category.entity'
import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { PlaceSource } from '../enums/place-source.enum'

@Entity()
export class Place extends BaseEntity {
  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Check(`length("name") >= 1`)
  @Column({ length: 100 })
  name: string

  @Check(`length("address") >= 1`)
  @Column({ length: 255 })
  address: string

  @Check(`"latitude" BETWEEN -90 AND 90`)
  @Column('float')
  latitude: number

  @Check(`"longitude" BETWEEN -180 AND 180`)
  @Column('float')
  longitude: number

  @Column({ type: 'enum', enum: PlaceSource })
  source: PlaceSource

  @Column({ length: 100 })
  previewUrl: string
}
