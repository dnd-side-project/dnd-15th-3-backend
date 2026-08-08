import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'

@Entity()
@Unique(['meeting', 'order'])
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
