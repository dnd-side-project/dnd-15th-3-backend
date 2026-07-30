import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity } from 'typeorm'

@Entity()
@Check(`length("name") >= 1`)
@Check(`"slug" ~ '^[a-z0-9-]+$'`)
export class Category extends BaseEntity {
  @Column({ length: 10, unique: true, comment: 'Category display name' })
  name: string

  @Column({
    length: 50,
    unique: true,
    comment: 'Unique identifier used in URL',
  })
  slug: string

  @Column({ unique: true })
  displayOrder: number
}
