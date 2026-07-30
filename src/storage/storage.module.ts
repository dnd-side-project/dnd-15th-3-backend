import { S3Client } from '@aws-sdk/client-s3'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'
import { StorageService } from './storage.service'

function buildOciS3Endpoint(
  namespace: string,
  region: string,
  customEndpoint?: string,
): string {
  if (customEndpoint) {
    return customEndpoint
  }
  return `https://${namespace}.compat.objectstorage.${region}.oraclecloud.com`
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'S3_CLIENT',
      useFactory: (config: ConfigService<Env, true>) => {
        const namespace = config.get('OCI_NAMESPACE', { infer: true })
        const region = config.get('OCI_REGION', { infer: true })
        const customEndpoint = config.get('OCI_S3_ENDPOINT', { infer: true })
        const accessKey = config.get('OCI_S3_ACCESS_KEY', { infer: true })
        const secretKey = config.get('OCI_S3_SECRET_KEY', { infer: true })

        const endpoint = buildOciS3Endpoint(namespace, region, customEndpoint)

        return new S3Client({
          region,
          endpoint,
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
          forcePathStyle: true,
        })
      },
      inject: [ConfigService],
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
