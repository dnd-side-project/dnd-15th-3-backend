import { Controller, Get, Logger, UseFilters } from '@nestjs/common'
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus'
import { HealthExceptionFilter } from './health-exception.filter'
import { OciStorageHealthIndicator } from './storage.health'

@ApiTags('헬스 체크')
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
  @UseFilters(HealthExceptionFilter)
  @ApiOperation({ summary: '애플리케이션 상태 확인' })
  @ApiResponse({ status: 200, description: '모든 의존성이 정상입니다.' })
  @ApiResponse({
    status: 503,
    description: '하나 이상의 의존성이 비정상입니다.',
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
  @ApiExcludeEndpoint()
  checkLiveness() {
    return { status: 'ok' }
  }
}
