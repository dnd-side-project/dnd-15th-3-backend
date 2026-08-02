import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { CourseGeneration } from './course-generation.entity'

@Entity()
@Unique(['generation', 'slotKey'])
export class CourseCandidate extends BaseEntity {
  @ManyToOne(
    () => CourseGeneration,
    (generation) => generation.candidates,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'generation_id' })
  generation: CourseGeneration

  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @Column()
  order: number

  @Column({ length: 64 })
  slotKey: string

  @Column({ length: 64 })
  strategy: string

  @Column({ default: false })
  isSelected: boolean
}
