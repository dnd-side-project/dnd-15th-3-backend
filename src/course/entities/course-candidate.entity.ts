import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'

@Entity()
@Unique(['meeting', 'order'])
export class CourseCandidate extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @Column()
  order: number

  @Column({ default: false })
  isSelected: boolean
}
