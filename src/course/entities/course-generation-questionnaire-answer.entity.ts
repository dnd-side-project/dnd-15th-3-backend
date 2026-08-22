import { BaseEntity } from 'src/common/entities/base.entity'
import { MeetingQuestion } from 'src/questionnaire/entities/meeting-question.entity'
import { MeetingQuestionOption } from 'src/questionnaire/entities/meeting-question-option.entity'
import { Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { CourseGenerationRun } from './course-generation-run.entity'

@Entity()
@Unique(['generationRun', 'question'])
export class CourseGenerationQuestionnaireAnswer extends BaseEntity {
  @ManyToOne(
    () => CourseGenerationRun,
    (generationRun) => generationRun.questionnaireAnswers,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'generation_run_id' })
  generationRun: CourseGenerationRun

  @ManyToOne(() => MeetingQuestion, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'question_id' })
  question: MeetingQuestion

  @ManyToOne(() => MeetingQuestionOption, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'option_id' })
  option: MeetingQuestionOption
}
