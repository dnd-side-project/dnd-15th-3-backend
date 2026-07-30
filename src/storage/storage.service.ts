import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'

@Injectable()
export class StorageService {
  private readonly bucketName: string

  constructor(
    @Inject('S3_CLIENT') private readonly s3Client: S3Client,
    private readonly config: ConfigService<Env, true>,
  ) {
    const isDev = this.config.get('NODE_ENV', { infer: true }) === 'development'
    this.bucketName = isDev
      ? this.config.get('OCI_BUCKET_NAME_DEV', { infer: true })
      : this.config.get('OCI_BUCKET_NAME_PROD', { infer: true })
  }

  getBucketName(): string {
    return this.bucketName
  }

  getClient(): S3Client {
    return this.s3Client
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.s3Client.send(
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        new HeadBucketCommand({ Bucket: this.bucketName }),
      )
      return true
    } catch {
      return false
    }
  }
}
