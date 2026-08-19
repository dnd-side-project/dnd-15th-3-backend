import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MediaModule } from '../media/media.module'
import { HealthController } from './health.controller'
import { PostgisHealthIndicator } from './postgis.health'
import { OciStorageHealthIndicator } from './storage.health'

@Module({
  imports: [TerminusModule, TypeOrmModule, MediaModule],
  controllers: [HealthController],
  providers: [OciStorageHealthIndicator, PostgisHealthIndicator],
})
export class HealthModule {}
