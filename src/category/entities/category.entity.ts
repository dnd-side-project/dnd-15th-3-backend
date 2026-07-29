import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity } from 'typeorm'

@Entity()
export class Category extends BaseEntity {
  @Check(`length("name") >= 1`)
  @Column({ length: 10, unique: true, comment: 'Category display name' })
  name: string

  @Check(`"slug" ~ '^[a-z0-9-]+$'`)
  @Column({
    length: 50,
    unique: true,
    comment: 'Unique identifier used in URL',
  })
  slug: string

  @Column({ unique: true })
  displayOrder: number
}
