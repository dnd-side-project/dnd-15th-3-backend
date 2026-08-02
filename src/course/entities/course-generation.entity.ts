import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CourseCandidate } from './course-candidate.entity'

@Entity()
export class CourseGeneration extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @Column({ length: 32 })
  mode: string

  @Column({ type: 'int' })
  revision: number

  @Column({ nullable: true })
  parentGenerationId: string | null

  @Column({ length: 64 })
  requestHash: string

  @Column({ length: 64 })
  promptHash: string

  @Column({ length: 128 })
  variationSeed: string

  @Column({ length: 32 })
  status: string

  @Column({ type: 'jsonb', nullable: true })
  constraints: Record<string, unknown> | null

  @Column({ length: 64, nullable: true })
  provider: string | null

  @Column({ length: 255, nullable: true })
  model: string | null

  @Column({ default: false })
  usedFallback: boolean

  @OneToMany(
    () => CourseCandidate,
    (candidate) => candidate.generation,
  )
  candidates: CourseCandidate[]
}
