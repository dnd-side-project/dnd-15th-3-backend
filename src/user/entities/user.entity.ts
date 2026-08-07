import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity } from 'typeorm'

@Entity()
@Check(`length("user_key") >= 1`)
export class User extends BaseEntity {
  @Column({ length: 255, unique: true })
  userKey: string
}
