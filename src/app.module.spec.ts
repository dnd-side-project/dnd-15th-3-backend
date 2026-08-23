import { MODULE_METADATA } from '@nestjs/common/constants'
import {
  AppModule,
  createStatisticsTypeOrmOptions,
  createTypeOrmOptions,
} from './app.module'
import {
  STATISTICS_ENTITIES_GLOB,
  STATISTICS_MIGRATIONS_GLOB,
} from './database/database.options'
import { STATISTICS_DATABASE_CONNECTION } from './statistics/statistics.constants'

function getModuleName(value: unknown) {
  if (typeof value === 'function') return value.name
  if (typeof value !== 'object' || value === null || !('module' in value)) {
    return undefined
  }

  return typeof value.module === 'function' ? value.module.name : undefined
}

describe('AppModule', () => {
  it('enables database certificate validation when SSL is enabled', () => {
    const values = new Map<string, unknown>([
      ['DB_SSL', true],
      ['DB_SSL_CA', 'root-ca'],
      ['DB_HOST', 'db.example.com'],
      ['DB_PORT', 5432],
      ['DB_USERNAME', 'postgres'],
      ['DB_PASSWORD', 'password'],
      ['DB_DATABASE', 'momo'],
      ['DB_SYNCHRONIZE', false],
    ])
    const config = {
      get: (key: string) => values.get(key),
    }

    const options = createTypeOrmOptions(config as never) as {
      ssl?: unknown
    }

    expect(options.ssl).toEqual({
      ca: 'root-ca',
      rejectUnauthorized: true,
    })
  })

  it('enables database certificate validation for the statistics connection when SSL is enabled', () => {
    const values = new Map<string, unknown>([
      ['STATS_DB_SSL', true],
      ['STATS_DB_SSL_CA', 'root-ca'],
      ['STATS_DB_HOST', 'stats-db.example.com'],
      ['STATS_DB_PORT', 5432],
      ['STATS_DB_USERNAME', 'postgres'],
      ['STATS_DB_PASSWORD', 'password'],
      ['STATS_DB_DATABASE', 'momo_statistics'],
      ['STATS_DB_SYNCHRONIZE', false],
    ])
    const config = {
      get: (key: string) => values.get(key),
    }

    const options = createStatisticsTypeOrmOptions(config as never) as {
      ssl?: unknown
    }

    expect(options.ssl).toEqual({
      ca: 'root-ca',
      rejectUnauthorized: true,
    })
  })

  it('disables SSL for the statistics connection when STATS_DB_SSL is false', () => {
    const values = new Map<string, unknown>([['STATS_DB_SSL', false]])
    const config = {
      get: (key: string) => values.get(key),
    }

    const options = createStatisticsTypeOrmOptions(config as never) as {
      ssl?: unknown
    }

    expect(options.ssl).toBe(false)
  })

  it('points the statistics connection at the declared statistics-only globs', () => {
    const config = {
      get: () => undefined,
    }

    const options = createStatisticsTypeOrmOptions(config as never) as {
      entities?: string[]
      migrations?: string[]
    }

    expect(options.entities?.[0]).toEqual(
      expect.stringContaining(STATISTICS_ENTITIES_GLOB),
    )
    expect(options.migrations?.[0]).toEqual(
      expect.stringContaining(STATISTICS_MIGRATIONS_GLOB),
    )
  })

  it('names the statistics connection so it can be injected with @InjectDataSource', () => {
    const config = {
      get: () => undefined,
    }

    const options = createStatisticsTypeOrmOptions(config as never) as {
      name?: string
    }

    expect(options.name).toBe(STATISTICS_DATABASE_CONNECTION)
  })

  it('does not register a frontend mock API module', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as
      | unknown[]
      | undefined

    expect(imports?.map(getModuleName)).not.toContain('MockApiModule')
  })

  it('registers internal media support without a generic storage module', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as
      | unknown[]
      | undefined
    const moduleNames = imports?.map(getModuleName)

    expect(moduleNames).toContain('MediaModule')
    expect(moduleNames).not.toContain('StorageModule')
  })
})
