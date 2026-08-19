import type { DataSource } from 'typeorm'
import { PostgisHealthIndicator } from './postgis.health'

describe('PostgisHealthIndicator', () => {
  it('reports the installed PostGIS version', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ version: '3.5.7' }]),
    } as unknown as DataSource
    const indicator = new PostgisHealthIndicator(dataSource)

    await expect(indicator.isHealthy('postgis')).resolves.toEqual({
      postgis: { status: 'up', version: '3.5.7' },
    })
  })

  it('reports down when the extension query fails', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('missing extension')),
    } as unknown as DataSource
    const indicator = new PostgisHealthIndicator(dataSource)

    await expect(indicator.isHealthy('postgis')).rejects.toMatchObject({
      causes: { postgis: { status: 'down' } },
    })
  })

  it('reports down when the extension query returns no version', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource
    const indicator = new PostgisHealthIndicator(dataSource)

    await expect(indicator.isHealthy('postgis')).rejects.toMatchObject({
      message: 'PostGIS extension is unavailable',
      causes: { postgis: { status: 'down' } },
    })
  })
})
