import { Injectable } from '@nestjs/common'
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus'
import { DataSource } from 'typeorm'

type PostgisVersionRow = {
  version: string
}

@Injectable()
export class PostgisHealthIndicator extends HealthIndicator {
  constructor(private readonly dataSource: DataSource) {
    super()
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const rows = await this.dataSource.query<PostgisVersionRow[]>(
        'SELECT postgis_lib_version() AS version',
      )
      const version = rows[0]?.version
      const result = this.getStatus(key, Boolean(version), { version })

      if (version) return result
      throw new HealthCheckError('PostGIS extension is unavailable', result)
    } catch (error) {
      if (error instanceof HealthCheckError) throw error

      const result = this.getStatus(key, false)
      throw new HealthCheckError('PostGIS health check failed', result)
    }
  }
}
