import { Column } from 'typeorm'
import { BaseEntity } from './base.entity'

export abstract class ImageBase extends BaseEntity {
  @Column({ unique: true })
  imageKey: string
}
