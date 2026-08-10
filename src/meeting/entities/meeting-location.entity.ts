import { BaseEntity } from 'src/common/entities/base.entity'
import type { Point } from 'typeorm'
import { Check, Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm'
import { Meeting } from './meeting.entity'

@Entity()
@Index('IDX_meeting_location_meeting', ['meeting'], { unique: true })
@Check(`length("display_name") >= 1`)
@Check(`length("address") >= 1`)
@Check(`"latitude" BETWEEN -90 AND 90`)
@Check(`"longitude" BETWEEN -180 AND 180`)
export class MeetingLocation extends BaseEntity {
  @OneToOne(
    () => Meeting,
    (meeting) => meeting.meetingLocation,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @Column({ name: 'display_name', length: 100 })
  displayName: string

  @Column({ length: 255 })
  address: string

  @Column('float')
  latitude: number

  @Column('float')
  longitude: number

  @Column('varchar', {
    name: 'external_address_id',
    length: 255,
    nullable: true,
  })
  externalAddressId: string | null

  @Column({ name: 'sync_version', default: 1 })
  syncVersion: number

  @Index('IDX_meeting_location_location', { spatial: true, type: 'gist' })
  @Column('geography', { spatialFeatureType: 'Point', srid: 4326 })
  location: Point
}
