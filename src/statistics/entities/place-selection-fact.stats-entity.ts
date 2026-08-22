import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

// 원본 사실 테이블. 코스 하나가 확정되면 그 코스에 포함된 장소마다 row가 하나씩 생성
// 집계는 해당 원본 사실 테이블을 바탕으로 계산
// 별도 카운터 테이블을 두지 않는다. 매번 다시 집계해도 태그의 경우 배치 방식으로 비용 큰 문제가 없고,
// 나중에 실시간을 위한 캐시 테이블이 필요할 경우 해당 사실 테이블 정보를 바탕으로 캐시 테이블을 생성 가능
@Entity()
@Index(['meetingId', 'courseVersion'])
@Check(`"outbox_event_id" > 0`)
@Check(`"place_id" > 0`)
@Check(`"place_category_id" > 0`)
@Check(`"meeting_id" > 0`)
@Check(`"meeting_type_id" > 0`)
@Check(`"course_version" >= 1`)
@Check(`"participant_count" >= 1`)
@Check(`"like_count" >= 0`)
@Check(`"dislike_count" >= 0`)
@Check(`"like_count" + "dislike_count" <= "participant_count"`)
export class PlaceSelectionFact {
  @PrimaryColumn({ name: 'outbox_event_id', type: 'bigint' })
  outboxEventId: string

  @PrimaryColumn({ name: 'place_id', type: 'bigint' })
  placeId: string

  @Column({ name: 'place_category_id', type: 'bigint' })
  placeCategoryId: string

  @Column({ name: 'meeting_id', type: 'bigint' })
  meetingId: string

  @Column({ name: 'meeting_type_id', type: 'bigint' })
  meetingTypeId: string

  @Column({ name: 'meeting_date', type: 'date' })
  meetingDate: string

  @Column({ name: 'meeting_time', type: 'time', precision: 0 })
  meetingTime: string

  // 코스 재확정 기능이 생기면 같은 meeting_id로 여러 버전의 row가 쌓일 수 있어,
  // 집계 시 "이 모임의 가장 최신 버전"만 골라내는 데 사용
  @Column({ name: 'course_version' })
  courseVersion: number

  // 참여 인원 수. like_count+dislike_count 상한 검증 및 향후 모임 규모별 통계에 사용
  @Column({ name: 'participant_count' })
  participantCount: number

  @Column({ name: 'like_count' })
  likeCount: number

  @Column({ name: 'dislike_count' })
  dislikeCount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
