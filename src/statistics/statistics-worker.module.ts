import { join } from 'node:path'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm'
import {
  CORE_ENTITIES_GLOB,
  CORE_MIGRATIONS_GLOB,
  createDatabaseOptions,
  STATISTICS_ENTITIES_GLOB,
  STATISTICS_MIGRATIONS_GLOB,
} from 'src/database/database.options'
import {
  type StatisticsWorkerEnv,
  validateStatisticsWorkerEnv,
} from './config/statistics-worker.env'
import { PlaceTagAggregationService } from './place-tag-aggregation.service'
import { CORE_DATABASE_CONNECTION } from './statistics.constants'
import { StatisticsAdminService } from './statistics-admin.service'
import { StatisticsOutboxProcessor } from './statistics-outbox.processor'
import { StatisticsOutboxWorker } from './statistics-outbox.worker'
import { StatisticsRebuildService } from './statistics-rebuild.service'

export function createCoreTypeOrmOptions(
  config: ConfigService<StatisticsWorkerEnv, true>,
): TypeOrmModuleOptions {
  const options = createDatabaseOptions(
    {
      host: config.get('DB_HOST', { infer: true }),
      port: config.get('DB_PORT', { infer: true }),
      username: config.get('DB_USERNAME', { infer: true }),
      password: config.get('DB_PASSWORD', { infer: true }),
      database: config.get('DB_DATABASE', { infer: true }),
      ssl: config.get('DB_SSL', { infer: true }),
      sslCa: config.get('DB_SSL_CA', { infer: true }),
      synchronize: false,
    },
    join(__dirname, '..'),
    {
      entitiesGlob: CORE_ENTITIES_GLOB,
      migrationsGlob: CORE_MIGRATIONS_GLOB,
    },
  )
  return {
    ...options,
    // Nest TypeORM은 비동기 named connection 종료 시 factory 결과의
    // name으로 DataSource token을 다시 찾는다.
    name: CORE_DATABASE_CONNECTION,
  } as TypeOrmModuleOptions
}

export function createStatsTypeOrmOptions(
  config: ConfigService<StatisticsWorkerEnv, true>,
): TypeOrmModuleOptions {
  return createDatabaseOptions(
    {
      host: config.get('STATS_DB_HOST', { infer: true }),
      port: config.get('STATS_DB_PORT', { infer: true }),
      username: config.get('STATS_DB_USERNAME', { infer: true }),
      password: config.get('STATS_DB_PASSWORD', { infer: true }),
      database: config.get('STATS_DB_DATABASE', { infer: true }),
      ssl: config.get('STATS_DB_SSL', { infer: true }),
      sslCa: config.get('STATS_DB_SSL_CA', { infer: true }),
      synchronize: config.get('STATS_DB_SYNCHRONIZE', { infer: true }),
    },
    join(__dirname, '..'),
    {
      entitiesGlob: STATISTICS_ENTITIES_GLOB,
      migrationsGlob: STATISTICS_MIGRATIONS_GLOB,
    },
  ) as TypeOrmModuleOptions
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateStatisticsWorkerEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createStatsTypeOrmOptions,
    }),
    TypeOrmModule.forRootAsync({
      name: CORE_DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: createCoreTypeOrmOptions,
    }),
  ],
  providers: [
    PlaceTagAggregationService,
    StatisticsOutboxProcessor,
    StatisticsOutboxWorker,
    StatisticsRebuildService,
    StatisticsAdminService,
  ],
})
export class StatisticsWorkerModule {}
