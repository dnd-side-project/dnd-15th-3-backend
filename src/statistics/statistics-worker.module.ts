import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm'
import {
  createDatabaseOptions,
  STATISTICS_ENTITIES_GLOB,
  STATISTICS_MIGRATIONS_GLOB,
} from 'src/database/database.options'
import {
  type StatisticsWorkerEnv,
  validateStatisticsWorkerEnv,
} from './config/statistics-worker.env'

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
    __dirname,
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
  ],
})
export class StatisticsWorkerModule {}
