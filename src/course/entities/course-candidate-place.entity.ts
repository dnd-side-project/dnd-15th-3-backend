import { BaseEntity } from 'src/common/entities/base.entity'
import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { CourseCandidate } from './course-candidate.entity'
import { MeetingPlaceRecommendation } from './meeting-place-recommendation.entity'

@Entity()
@Unique(['courseCandidate', 'order'])
@Check(`"travel_time_to_next" >= 0`)
@Check(`"distance_to_next_meters" >= 0`)
@Check(`("travel_time_to_next" IS NULL) = ("distance_to_next_meters" IS NULL)`)
export class CourseCandidatePlace extends BaseEntity {
  @ManyToOne(() => CourseCandidate, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_candidate_id' })
  courseCandidate: CourseCandidate

  @ManyToOne(() => MeetingPlaceRecommendation, { nullable: false })
  @JoinColumn({ name: 'meeting_place_recommendation_id' })
  meetingPlaceRecommendation: MeetingPlaceRecommendation

  @Column()
  order: number

  @Column({ nullable: true, comment: 'Unit: seconds' })
  travelTimeToNext: number

  @Column({ nullable: true, comment: 'Unit: meter' })
  distanceToNextMeters: number
}
