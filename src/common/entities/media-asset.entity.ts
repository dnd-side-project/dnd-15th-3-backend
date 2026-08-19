import { MimeType } from 'src/common/enums/mime-type.enum'
import { Check, Column, Entity } from 'typeorm'
import { BaseEntity } from './base.entity'

@Entity()
@Check(`length("object_key") >= 1`)
@Check(`"source_url" IS NULL OR length("source_url") >= 1`)
export class MediaAsset extends BaseEntity {
  @Column({ unique: true })
  objectKey: string

  @Column({ nullable: true, unique: true, length: 500 })
  sourceUrl: string

  @Column({ type: 'enum', enum: MimeType })
  mimeType: MimeType
}
