import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'
import type { QuestionnaireOptionCode } from '../questionnaire.constants'
import { MeetingQuestion } from './meeting-question.entity'

@Entity()
@Unique(['question', 'order'])
@Unique(['question', 'semanticCode'])
@Check(`"order" >= 1`)
@Check(`length("semantic_code") >= 1`)
@Check(`length("emoji") >= 1`)
@Check(`length("label") >= 1`)
export class MeetingQuestionOption extends BaseEntity {
  @ManyToOne(
    () => MeetingQuestion,
    (question) => question.options,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'question_id' })
  question: MeetingQuestion

  @Column()
  order: number

  @Column({ name: 'semantic_code', type: 'varchar', length: 50 })
  semanticCode: QuestionnaireOptionCode

  @Column({ length: 16 })
  emoji: string

  @Column({ length: 100 })
  label: string
}
