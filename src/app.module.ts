import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { type Env, validateEnv } from './config/env'
import { HealthModule } from './health/health.module'
import { StorageModule } from './storage/storage.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
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
                rejectUnauthorized: false,
              }
            : false,
          entities: [`${__dirname}/**/*.entity{.ts,.js}`],
          namingStrategy: new SnakeNamingStrategy(),
          synchronize: config.get('DB_SYNCHRONIZE', { infer: true }),
        }
      },
    }),
    StorageModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
