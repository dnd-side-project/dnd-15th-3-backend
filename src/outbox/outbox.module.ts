import { Module } from '@nestjs/common'
import { OutboxEventRepository } from './outbox-event.repository'

@Module({
  providers: [OutboxEventRepository],
  exports: [OutboxEventRepository],
})
export class OutboxModule {}
