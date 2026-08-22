import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm'
import { QuestionnaireGenerationStatus } from '../enums/questionnaire-generation-status.enum'
import { QuestionnaireSource } from '../enums/questionnaire-source.enum'
import { MeetingQuestion } from './meeting-question.entity'

@Entity()
@Unique(['meeting', 'version'])
@Check(`"version" >= 1`)
@Check(`"schema_version" >= 1`)
@Check(`"prompt_version" >= 1`)
@Check(`"generation_attempt_count" >= 0`)
@Check(`length("provider") >= 1`)
@Check(`length("model") >= 1`)
export class MeetingQuestionnaire extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @Column({ default: 1 })
  version: number

  @Column({ name: 'schema_version' })
  schemaVersion: number

  @Column({ name: 'prompt_version' })
  promptVersion: number

  @Column({
    type: 'enum',
    enum: QuestionnaireGenerationStatus,
    default: QuestionnaireGenerationStatus.Generating,
  })
  generationStatus: QuestionnaireGenerationStatus

  @Column({ type: 'enum', enum: QuestionnaireSource, nullable: true })
  source: QuestionnaireSource | null

  @Column({ length: 50 })
  provider: string

  @Column({ length: 100 })
  model: string

  @Column({ type: 'text', nullable: true })
  generationError: string | null

  @Column({ name: 'generation_attempt_count', default: 0 })
  generationAttemptCount: number

  @Column({ type: 'timestamp', nullable: true })
  generationStartedAt: Date | null

  @Column({ type: 'timestamp', nullable: true })
  generatedAt: Date | null

  @OneToMany(
    () => MeetingQuestion,
    (question) => question.questionnaire,
  )
  questions: MeetingQuestion[]
}
