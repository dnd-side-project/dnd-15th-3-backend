import { Category } from 'src/category/entities/category.entity'
import { BaseEntity } from 'src/common/entities/base.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import type { Point } from 'typeorm'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { PlaceSource } from '../enums/place-source.enum'
import { PlaceSyncJobStatus } from '../enums/place-sync-job-status.enum'

@Entity()
@Index(['meeting', 'category', 'source', 'locationVersion'], { unique: true })
@Index(['status', 'nextRunAt'])
@Index(['status', 'startedAt'])
export class PlaceSyncJob extends BaseEntity {
  @ManyToOne(() => Meeting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category

  @Column({ type: 'enum', enum: PlaceSource })
  source: PlaceSource

  @Column({ name: 'location_version' })
  locationVersion: number

  @Column('geography', { spatialFeatureType: 'Point', srid: 4326 })
  center: Point

  @Column({ name: 'radius_meters', default: 2000 })
  radiusMeters: number

  @Column({
    type: 'enum',
    enum: PlaceSyncJobStatus,
    default: PlaceSyncJobStatus.Pending,
  })
  status: PlaceSyncJobStatus

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount: number

  @Column({ name: 'next_run_at', default: () => 'CURRENT_TIMESTAMP' })
  nextRunAt: Date

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null

  @Column({ name: 'result_count', default: 0 })
  resultCount: number

  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt: Date | null

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date | null
}
