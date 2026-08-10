import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity } from 'typeorm'

@Entity()
@Check(`length("name") >= 1`)
export class MeetingType extends BaseEntity {
  @Column({ length: 50, unique: true })
  code: string

  @Column({ length: 10, unique: true })
  name: string

  @Column({ unique: true })
  displayOrder: number
}
