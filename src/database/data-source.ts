import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnvFile } from 'node:process'
import { DataSource } from 'typeorm'
import { createDatabaseOptions, readDatabaseConfig } from './database.options'

if (existsSync('.env')) {
  loadEnvFile('.env')
}

export default new DataSource(
  createDatabaseOptions(
    { ...readDatabaseConfig(), synchronize: false },
    join(__dirname, '..'),
  ),
)
