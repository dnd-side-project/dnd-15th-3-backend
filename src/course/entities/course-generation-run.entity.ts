import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingQuestionnaire } from 'src/questionnaire/entities/meeting-questionnaire.entity'
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm'
import { CourseGenerationCustomizationType } from '../enums/course-generation-customization-type.enum'
import { CourseGenerationRunStatus } from '../enums/course-generation-run-status.enum'
import type { CourseGenerationInputSnapshot } from '../schema/course-generation-input.schema'
import type { CourseGenerationOutputSnapshot } from '../schema/course-generation-output.schema'
import { CourseGenerationQuestionnaireAnswer } from './course-generation-questionnaire-answer.entity'

@Entity()
@Unique(['meeting', 'runVersion'])
@Index(['meeting'], {
  unique: true,
  where: `"status" IN ('PENDING', 'PROCESSING')`,
})
@Check(`"run_version" >= 1`)
@Check(`"attempt_count" >= 0`)
@Check(`length("input_hash") = 64`)
@Check(
  `("customization_type" = 'QUESTIONNAIRE') = ("questionnaire_id" IS NOT NULL)`,
)
@Check(`("status" = 'SUCCEEDED') = ("output_snapshot" IS NOT NULL)`)
@Check(`("status" IN ('SUCCEEDED', 'FAILED')) = ("completed_at" IS NOT NULL)`)
@Check(`"status" <> 'PROCESSING' OR "started_at" IS NOT NULL`)
export class CourseGenerationRun extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @ManyToOne(() => MeetingParticipant, { nullable: false })
  @JoinColumn({ name: 'requested_by_participant_id' })
  requestedBy: MeetingParticipant

  @ManyToOne(() => MeetingQuestionnaire, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'questionnaire_id' })
  questionnaire: MeetingQuestionnaire | null

  @Column({ name: 'run_version' })
  runVersion: number

  @Column({
    type: 'enum',
    enum: CourseGenerationRunStatus,
    default: CourseGenerationRunStatus.Pending,
  })
  status: CourseGenerationRunStatus

  @Column({
    name: 'customization_type',
    type: 'enum',
    enum: CourseGenerationCustomizationType,
  })
  customizationType: CourseGenerationCustomizationType

  @Column({ name: 'input_snapshot', type: 'jsonb' })
  inputSnapshot: CourseGenerationInputSnapshot

  @Column({ name: 'input_hash', type: 'char', length: 64 })
  inputHash: string

  @Column({ name: 'output_snapshot', type: 'jsonb', nullable: true })
  outputSnapshot: CourseGenerationOutputSnapshot | null

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount: number

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null

  @OneToMany(
    () => CourseGenerationQuestionnaireAnswer,
    (answer) => answer.generationRun,
  )
  questionnaireAnswers: CourseGenerationQuestionnaireAnswer[]

  isFailed(): boolean {
    return this.status === CourseGenerationRunStatus.Failed
  }

  isPending(): boolean {
    return this.status === CourseGenerationRunStatus.Pending
  }

  isResumable(): boolean {
    return (
      this.status === CourseGenerationRunStatus.Pending ||
      this.status === CourseGenerationRunStatus.Processing
    )
  }

  prepareForProcessing(participant: MeetingParticipant): void {
    this.status = CourseGenerationRunStatus.Processing
    this.requestedBy = participant
    this.attemptCount += 1
    this.errorMessage = null
    this.outputSnapshot = null
    this.startedAt = new Date()
    this.completedAt = null
  }
}
