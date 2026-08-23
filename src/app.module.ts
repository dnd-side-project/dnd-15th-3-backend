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
import { ObservabilityModule } from './common/observability/observability.module'
import { type Env, validateEnv } from './config/env'
import { CourseModule } from './course/course.module'
import {
  CORE_ENTITIES_GLOB,
  CORE_MIGRATIONS_GLOB,
  createDatabaseOptions,
} from './database/database.options'
import { HealthModule } from './health/health.module'
import { MediaModule } from './media/media.module'
import { MeetingModule } from './meeting/meeting.module'
import { PlaceModule } from './place/place.module'

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

const infrastructureModules = [
  TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: createTypeOrmOptions,
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
    ObservabilityModule,
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
