import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  equals(other: BaseEntity): boolean {
    return this.id === other.id
  }
}
