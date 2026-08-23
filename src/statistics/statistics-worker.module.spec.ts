import { MODULE_METADATA } from '@nestjs/common/constants'
import { AppModule } from 'src/app.module'
import {
  CORE_ENTITIES_GLOB,
  CORE_MIGRATIONS_GLOB,
  STATISTICS_ENTITIES_GLOB,
  STATISTICS_MIGRATIONS_GLOB,
} from 'src/database/database.options'
import {
  createCoreTypeOrmOptions,
  createStatsTypeOrmOptions,
  StatisticsWorkerModule,
} from './statistics-worker.module'

const SHARED_INFRASTRUCTURE_MODULES = new Set(['ConfigModule', 'TypeOrmModule'])

function getModuleName(value: unknown) {
  if (typeof value === 'function') return value.name
  if (typeof value !== 'object' || value === null || !('module' in value)) {
    return undefined
  }

  return typeof value.module === 'function' ? value.module.name : undefined
}

describe('StatisticsWorkerModule', () => {
  it('enables database certificate validation when SSL is enabled', () => {
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

    const options = createStatsTypeOrmOptions(config as never) as {
      ssl?: unknown
    }

    expect(options.ssl).toEqual({
      ca: 'root-ca',
      rejectUnauthorized: true,
    })
  })

  it('disables SSL when STATS_DB_SSL is false', () => {
    const values = new Map<string, unknown>([['STATS_DB_SSL', false]])
    const config = {
      get: (key: string) => values.get(key),
    }

    const options = createStatsTypeOrmOptions(config as never) as {
      ssl?: unknown
    }

    expect(options.ssl).toBe(false)
  })

  it('points entities and migrations at the declared statistics-only globs', () => {
    const config = {
      get: () => undefined,
    }

    const options = createStatsTypeOrmOptions(config as never) as {
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

  it('connects to the Core DB as a non-synchronizing Outbox source', () => {
    const values = new Map<string, unknown>([
      ['DB_HOST', 'core-db.example.com'],
      ['DB_PORT', 5432],
      ['DB_USERNAME', 'reader'],
      ['DB_PASSWORD', 'password'],
      ['DB_DATABASE', 'momo'],
      ['DB_SSL', false],
    ])
    const options = createCoreTypeOrmOptions({
      get: (key: string) => values.get(key),
    } as never) as {
      name?: string
      synchronize?: boolean
      entities?: string[]
      migrations?: string[]
    }

    expect(options.name).toBe('core')
    expect(options.synchronize).toBe(false)
    expect(options.entities?.[0]).toEqual(
      expect.stringContaining(CORE_ENTITIES_GLOB),
    )
    expect(options.migrations?.[0]).toEqual(
      expect.stringContaining(CORE_MIGRATIONS_GLOB),
    )
  })

  it('does not import any module that AppModule registers for the API', () => {
    const appImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[]
    const workerImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      StatisticsWorkerModule,
    ) as unknown[]

    const appModuleNames = new Set(
      appImports.map(getModuleName).filter((name) => name !== undefined),
    )
    const workerModuleNames = workerImports
      .map(getModuleName)
      .filter((name) => name !== undefined)

    const overlap = workerModuleNames.filter(
      (name) =>
        appModuleNames.has(name) && !SHARED_INFRASTRUCTURE_MODULES.has(name),
    )

    expect(overlap).toEqual([])
  })
})
