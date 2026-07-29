import { BaseEntity } from 'src/common/entities/base.entity'
import { Column, Entity } from 'typeorm'

@Entity()
export class MeetingType extends BaseEntity {
  @Column({ length: 10, unique: true })
  name: string

  @Column({ unique: true })
  displayOrder: number
}
