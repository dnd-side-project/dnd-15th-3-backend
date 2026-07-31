import { Injectable } from '@nestjs/common'
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus'
import { StorageService } from '../storage/storage.service'

@Injectable()
export class OciStorageHealthIndicator extends HealthIndicator {
  constructor(private readonly storageService: StorageService) {
    super()
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.storageService.checkHealth()
    const result = this.getStatus(key, isHealthy, {
      bucket: this.storageService.getBucketName(),
    })

    if (isHealthy) {
      return result
    }
    throw new HealthCheckError('OCI Storage health check failed', result)
  }
}
