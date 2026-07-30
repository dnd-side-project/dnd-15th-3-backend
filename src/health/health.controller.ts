import { Controller, Get, Logger } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus'
import { OciStorageHealthIndicator } from './storage.health'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name)

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly storage: OciStorageHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'App level health check' })
  @ApiResponse({ status: 200, description: 'All dependencies are healthy' })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unhealthy',
  })
  async checkAppHealth() {
    const result = await this.health.check([
      () => this.db.pingCheck('database', { timeout: 5000 }),
      () => this.storage.isHealthy('storage'),
    ])

    const checks = {
      database: result.info?.database?.status ?? result.error?.database?.status,
      storage: result.info?.storage?.status ?? result.error?.storage?.status,
    }

    if (result.status === 'ok') {
      this.logger.debug({ message: 'Health check passed', checks })
    } else {
      this.logger.warn({ message: 'Health check failed', checks })
    }

    return result
  }

  @Get('live')
  @ApiOperation({ summary: 'k3s liveness probe' })
  @ApiResponse({ status: 200, description: 'Application process is alive' })
  checkLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'k3s readiness probe (DB + S3)' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to receive traffic',
  })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  checkReadiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 5000 }),
      () => this.storage.isHealthy('storage'),
    ])
  }

  @Get('startup')
  @ApiOperation({ summary: 'k3s startup probe' })
  @ApiResponse({
    status: 200,
    description: 'Application has started successfully',
  })
  checkStartup() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
