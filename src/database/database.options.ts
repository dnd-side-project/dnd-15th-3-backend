import { join } from 'node:path'
import type { DataSourceOptions } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

export type DatabaseConnectionConfig = {
  host: string
  port: number
  username: string
  password: string
  database: string
  ssl: boolean
  sslCa?: string
  synchronize: boolean
}

export type DatabaseOptionsGlobs = {
  entitiesGlob: string
  migrationsGlob: string
}

export const CORE_ENTITIES_GLOB = '**/*.entity{.ts,.js}'
export const CORE_MIGRATIONS_GLOB = 'database/migrations/*{.ts,.js}'

export function createDatabaseOptions(
  config: DatabaseConnectionConfig,
  rootDirectory: string,
  globs: DatabaseOptionsGlobs,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    ssl: config.ssl
      ? {
          ca: config.sslCa || undefined,
          rejectUnauthorized: true,
        }
      : false,
    entities: [join(rootDirectory, globs.entitiesGlob)],
    migrations: [join(rootDirectory, globs.migrationsGlob)],
    migrationsTableName: 'typeorm_migrations',
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: config.synchronize,
  }
}

export function readDatabaseConfig(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseConnectionConfig {
  return {
    host: environment.DB_HOST || 'localhost',
    port: Number(environment.DB_PORT || 5432),
    username: environment.DB_USERNAME || 'postgres',
    password: environment.DB_PASSWORD || '',
    database: environment.DB_DATABASE || 'postgres',
    ssl: environment.DB_SSL === 'true' || environment.DB_SSL === '1',
    sslCa: environment.DB_SSL_CA,
    synchronize:
      environment.DB_SYNCHRONIZE === 'true' ||
      environment.DB_SYNCHRONIZE === '1',
  }
}
