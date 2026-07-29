import { Category } from 'src/category/entities/category.entity'
import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'

@Entity()
@Unique(['meeting', 'order'])
export class CourseCategoryStep extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Column()
  order: number
}
