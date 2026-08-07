import { MODULE_METADATA } from '@nestjs/common/constants'
import { AppModule, createTypeOrmOptions } from './app.module'

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

  it('does not register the course API module', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as
      | unknown[]
      | undefined

    expect(imports?.map(getModuleName)).not.toContain('CourseModule')
  })

  it('does not register a frontend mock API module', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as
      | unknown[]
      | undefined

    expect(imports?.map(getModuleName)).not.toContain('MockApiModule')
  })
})
