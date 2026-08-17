import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CatalogModule } from './catalog/catalog.module'
import { GlobalExceptionFilter } from './common/exception/global-exception.filter'
import { type Env, validateEnv } from './config/env'
import { CourseModule } from './course/course.module'
import { createDatabaseOptions } from './database/database.options'
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
    ...infrastructureModules,
    CatalogModule,
    CourseModule,
    MeetingModule,
    PlaceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
