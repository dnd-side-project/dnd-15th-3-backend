import { BaseEntity } from 'src/common/entities/base.entity'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { Check, Column, Entity } from 'typeorm'

@Entity()
@Check(`length("user_key") >= 1`)
export class User extends BaseEntity {
  @Column({ length: 255, unique: true })
  userKey: string

  @Column({
    type: 'varchar',
    nullable: true,
    length: 255,
    comment: 'Selected profile avatar identifier',
  })
  profileAvatarId: ProfileAvatarId | null
}
