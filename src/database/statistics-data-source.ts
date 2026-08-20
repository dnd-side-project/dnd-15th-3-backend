import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnvFile } from 'node:process'
import { DataSource } from 'typeorm'
import {
  createDatabaseOptions,
  readStatisticsDatabaseConfig,
  STATISTICS_ENTITIES_GLOB,
  STATISTICS_MIGRATIONS_GLOB,
} from './database.options'

if (existsSync('.env')) {
  loadEnvFile('.env')
}

export default new DataSource(
  createDatabaseOptions(
    { ...readStatisticsDatabaseConfig(), synchronize: false },
    join(__dirname, '..'),
    {
      entitiesGlob: STATISTICS_ENTITIES_GLOB,
      migrationsGlob: STATISTICS_MIGRATIONS_GLOB,
    },
  ),
)
