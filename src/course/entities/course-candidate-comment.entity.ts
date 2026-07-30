import { BaseEntity } from 'src/common/entities/base.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { CourseCandidate } from './course-candidate.entity'

@Entity()
@Check(`length("content") >= 1`)
export class CourseCandidateComment extends BaseEntity {
  @ManyToOne(() => CourseCandidate, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_candidate_id' })
  courseCandidate: CourseCandidate

  @ManyToOne(() => MeetingParticipant, { nullable: false })
  @JoinColumn({ name: 'participant_id' })
  participant: MeetingParticipant

  @Column('text')
  content: string
}
