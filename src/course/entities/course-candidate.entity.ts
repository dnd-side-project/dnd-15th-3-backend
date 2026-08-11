import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm'

@Entity()
@Unique(['meeting', 'order'])
@Index(['meeting'], { unique: true, where: '"is_selected" = true' })
@Check(`length("name") >= 1`)
export class CourseCandidate extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @Column()
  order: number

  @Column({ type: 'varchar', length: 15 })
  name: string

  @Column({ default: false })
  isSelected: boolean
}
