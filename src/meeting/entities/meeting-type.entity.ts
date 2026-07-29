import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'

@Entity()
export class MeetingType extends BaseEntity {
  @Column({ length: 10, unique: true })
  name: string

  @Column({ unique: true })
  displayOrder: number
}
