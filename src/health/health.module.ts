import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StorageModule } from '../storage/storage.module'
import { HealthController } from './health.controller'
import { PostgisHealthIndicator } from './postgis.health'
import { OciStorageHealthIndicator } from './storage.health'

@Module({
  imports: [TerminusModule, TypeOrmModule, StorageModule],
  controllers: [HealthController],
  providers: [OciStorageHealthIndicator, PostgisHealthIndicator],
})
export class HealthModule {}
