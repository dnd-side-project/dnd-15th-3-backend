import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CatalogModule } from './catalog/catalog.module'
import { GlobalExceptionFilter } from './common/exception/global-exception.filter'
import { type Env, validateEnv } from './config/env'
import { CourseModule } from './course/course.module'
import {
  CORE_ENTITIES_GLOB,
  CORE_MIGRATIONS_GLOB,
  createDatabaseOptions,
  STATISTICS_ENTITIES_GLOB,
  STATISTICS_MIGRATIONS_GLOB,
} from './database/database.options'
import { HealthModule } from './health/health.module'
import { MediaModule } from './media/media.module'
import { MeetingModule } from './meeting/meeting.module'
import { PlaceModule } from './place/place.module'
import { STATISTICS_DATABASE_CONNECTION } from './statistics/statistics.constants'

if (existsSync('.env')) {
  loadEnvFile('.env')
}

export function createTypeOrmOptions(
  config: ConfigService<Env, true>,
): TypeOrmModuleOptions {
  return createDatabaseOptions(
    {
      host: config.get('DB_HOST', { infer: true }),
      port: config.get('DB_PORT', { infer: true }),
      username: config.get('DB_USERNAME', { infer: true }),
      password: config.get('DB_PASSWORD', { infer: true }),
      database: config.get('DB_DATABASE', { infer: true }),
      ssl: config.get('DB_SSL', { infer: true }),
      sslCa: config.get('DB_SSL_CA', { infer: true }),
      synchronize: config.get('DB_SYNCHRONIZE', { infer: true }),
    },
    __dirname,
    {
      entitiesGlob: CORE_ENTITIES_GLOB,
      migrationsGlob: CORE_MIGRATIONS_GLOB,
    },
  ) as TypeOrmModuleOptions
}

export function createStatisticsTypeOrmOptions(
  config: ConfigService<Env, true>,
): TypeOrmModuleOptions {
  const options = createDatabaseOptions(
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
  )
  return {
    ...options,
    name: STATISTICS_DATABASE_CONNECTION,
  } as TypeOrmModuleOptions
}

const infrastructureModules = [
  TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: createTypeOrmOptions,
  }),
  TypeOrmModule.forRootAsync({
    name: STATISTICS_DATABASE_CONNECTION,
    inject: [ConfigService],
    useFactory: createStatisticsTypeOrmOptions,
  }),
  MediaModule,
  HealthModule,
]

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ...infrastructureModules,
    CatalogModule,
    CourseModule,
    MeetingModule,
    PlaceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ transform: true }),
    },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
