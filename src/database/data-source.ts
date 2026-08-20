import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnvFile } from 'node:process'
import { DataSource } from 'typeorm'
import {
  CORE_ENTITIES_GLOB,
  CORE_MIGRATIONS_GLOB,
  createDatabaseOptions,
  readDatabaseConfig,
} from './database.options'

if (existsSync('.env')) {
  loadEnvFile('.env')
}

export default new DataSource(
  createDatabaseOptions(
    { ...readDatabaseConfig(), synchronize: false },
    join(__dirname, '..'),
    {
      entitiesGlob: CORE_ENTITIES_GLOB,
      migrationsGlob: CORE_MIGRATIONS_GLOB,
    },
  ),
)
