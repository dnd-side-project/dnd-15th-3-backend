import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity } from 'typeorm'

@Entity()
export class MeetingType extends BaseEntity {
  @Check(`length("name") >= 1`)
  @Column({ length: 10, unique: true })
  name: string

  @Column({ unique: true })
  displayOrder: number
}
