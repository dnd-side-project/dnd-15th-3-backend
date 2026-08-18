import { S3Client } from '@aws-sdk/client-s3'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MediaAsset } from '../common/entities/media-asset.entity'
import type { Env } from '../config/env'
import { MediaService } from './media.service'
import { MediaCleanupWorker } from './media-cleanup.worker'
import { MediaStorageService } from './media-storage.service'

function buildOciS3Endpoint(namespace: string, region: string): string {
  return `https://${namespace}.compat.objectstorage.${region}.oraclecloud.com`
}

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([MediaAsset])],
  providers: [
    {
      provide: 'S3_CLIENT',
      useFactory: (config: ConfigService<Env, true>) => {
        const namespace = config.get('OCI_NAMESPACE', { infer: true })
        const region = config.get('OCI_REGION', { infer: true })
        const accessKey = config.get('OCI_S3_ACCESS_KEY', { infer: true })
        const secretKey = config.get('OCI_S3_SECRET_KEY', { infer: true })

        return new S3Client({
          region,
          endpoint: buildOciS3Endpoint(namespace, region),
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
          forcePathStyle: true,
        })
      },
      inject: [ConfigService],
    },
    MediaStorageService,
    MediaService,
    MediaCleanupWorker,
  ],
  exports: [MediaService],
})
export class MediaModule {}
