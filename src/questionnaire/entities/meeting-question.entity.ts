import { BaseEntity } from 'src/common/entities/base.entity'
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm'
import type { QuestionnaireDimensionCode } from '../questionnaire.constants'
import { MeetingQuestionOption } from './meeting-question-option.entity'
import { MeetingQuestionnaire } from './meeting-questionnaire.entity'

@Entity()
@Unique(['questionnaire', 'order'])
@Unique(['questionnaire', 'dimensionCode'])
@Check(`"order" >= 1`)
@Check(`length("text") >= 1`)
@Check(`length("dimension_code") >= 1`)
export class MeetingQuestion extends BaseEntity {
  @ManyToOne(
    () => MeetingQuestionnaire,
    (questionnaire) => questionnaire.questions,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'questionnaire_id' })
  questionnaire: MeetingQuestionnaire

  @Column()
  order: number

  @Column({ name: 'dimension_code', type: 'varchar', length: 50 })
  dimensionCode: QuestionnaireDimensionCode

  @Column({ length: 200 })
  text: string

  @OneToMany(
    () => MeetingQuestionOption,
    (option) => option.question,
  )
  options: MeetingQuestionOption[]
}
