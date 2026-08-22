import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity, Unique } from 'typeorm'
import { PlaceTagCode } from '../enums/place-tag-code.enum'

@Entity()
@Unique(['placeId', 'tagCode'])
@Check(`"place_id" > 0`)
export class PlaceTag extends BaseEntity {
  @Column({ name: 'place_id', type: 'bigint' })
  placeId: string

  @Column({ name: 'tag_code', type: 'enum', enum: PlaceTagCode })
  tagCode: PlaceTagCode
}
