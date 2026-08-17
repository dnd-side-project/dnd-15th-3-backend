import type {
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus'
import { HealthController } from './health.controller'
import type { PostgisHealthIndicator } from './postgis.health'
import type { OciStorageHealthIndicator } from './storage.health'

describe('HealthController', () => {
  const health = {
    check: jest.fn(),
  }
  const database = {
    pingCheck: jest.fn(),
  }
  const postgis = {
    isHealthy: jest.fn(),
  }
  const storage = {
    isHealthy: jest.fn(),
  }
  let controller: HealthController

  beforeEach(() => {
    jest.clearAllMocks()
    database.pingCheck.mockResolvedValue({ database: { status: 'up' } })
    postgis.isHealthy.mockResolvedValue({ postgis: { status: 'up' } })
    storage.isHealthy.mockRejectedValue(new Error('OCI unavailable'))
    health.check.mockImplementation(async (indicators) => {
      const results = await Promise.all(
        indicators.map((indicator: () => Promise<unknown>) => indicator()),
      )
      const info = Object.assign({}, ...results)
      return { status: 'ok', info, error: {}, details: info }
    })
    controller = new HealthController(
      health as unknown as HealthCheckService,
      database as unknown as TypeOrmHealthIndicator,
      postgis as unknown as PostgisHealthIndicator,
      storage as unknown as OciStorageHealthIndicator,
    )
  })

  it('keeps application readiness healthy when OCI is unavailable', async () => {
    await expect(controller.checkAppHealth()).resolves.toMatchObject({
      status: 'ok',
      info: {
        database: { status: 'up' },
        postgis: { status: 'up' },
      },
    })
    expect(storage.isHealthy).not.toHaveBeenCalled()
  })

  it('reports OCI failure from the separate storage diagnostic', async () => {
    await expect(controller.checkStorageHealth()).rejects.toThrow(
      'OCI unavailable',
    )
    expect(database.pingCheck).not.toHaveBeenCalled()
    expect(postgis.isHealthy).not.toHaveBeenCalled()
  })
})
