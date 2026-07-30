import { Category } from 'src/category/entities/category.entity'
import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
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

  @Column({ length: 100 })
  previewUrl: string
}
