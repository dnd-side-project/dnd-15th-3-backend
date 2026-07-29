import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity } from 'typeorm'

@Entity()
export class User extends BaseEntity {
  @Check(`length("user_key") >= 1`)
  @Column({ length: 255, unique: true })
  userKey: string
}
