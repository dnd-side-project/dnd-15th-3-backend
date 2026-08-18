import { Injectable } from '@nestjs/common'
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus'
import { MediaService } from '../media/media.service'

@Injectable()
export class OciStorageHealthIndicator extends HealthIndicator {
  constructor(private readonly mediaService: MediaService) {
    super()
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.mediaService.checkStorageHealth()
    const result = this.getStatus(key, isHealthy, {
      bucket: this.mediaService.getBucketName(),
    })

    if (isHealthy) {
      return result
    }
    throw new HealthCheckError('OCI Storage health check failed', result)
  }
}
