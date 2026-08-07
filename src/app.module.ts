import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CatalogModule } from './catalog/catalog.module'
import { type Env, validateEnv } from './config/env'
import { HealthModule } from './health/health.module'
import { MeetingModule } from './meeting/meeting.module'
import { StorageModule } from './storage/storage.module'

if (existsSync('.env')) {
  loadEnvFile('.env')
}

export function createTypeOrmOptions(
  config: ConfigService<Env, true>,
): TypeOrmModuleOptions {
  const ssl = config.get('DB_SSL', { infer: true })
  const sslCa = config.get('DB_SSL_CA', { infer: true })

  return {
    type: 'postgres',
    host: config.get('DB_HOST', { infer: true }),
    port: config.get('DB_PORT', { infer: true }),
    username: config.get('DB_USERNAME', { infer: true }),
    password: config.get('DB_PASSWORD', { infer: true }),
    database: config.get('DB_DATABASE', { infer: true }),
    ssl: ssl
      ? {
          ca: sslCa || undefined,
          rejectUnauthorized: true,
        }
      : false,
    entities: [`${__dirname}/**/*.entity{.ts,.js}`],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: config.get('DB_SYNCHRONIZE', { infer: true }),
  }
}

const infrastructureModules = [
  TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: createTypeOrmOptions,
  }),
  StorageModule,
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
    MeetingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
