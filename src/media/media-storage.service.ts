import { Readable } from 'node:stream'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { MimeType } from '../common/enums/mime-type.enum'
import type { Env } from '../config/env'

const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable'

@Injectable()
export class MediaStorageService {
  private readonly bucketName: string
  private readonly publicBaseUrl: string

  constructor(
    @Inject('S3_CLIENT') private readonly s3Client: S3Client,
    config: ConfigService<Env, true>,
  ) {
    this.bucketName = config.get('MEDIA_BUCKET_NAME', { infer: true })
    this.publicBaseUrl = config
      .get('MEDIA_PUBLIC_BASE_URL', { infer: true })
      .replace(/\/+$/, '')
  }

  getBucketName(): string {
    return this.bucketName
  }

  getPublicUrl(objectKey: string): string {
    const encodedKey = objectKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
    return `${this.publicBaseUrl}/${encodedKey}`
  }

  async uploadImage(
    objectKey: string,
    body: Uint8Array,
    mimeType: MimeType,
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Bucket: this.bucketName,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Key: objectKey,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Body: body,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        ContentType: mimeType,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        CacheControl: PUBLIC_CACHE_CONTROL,
      }),
    )
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Bucket: this.bucketName,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Key: objectKey,
      }),
    )
  }

  async downloadObject(objectKey: string): Promise<Readable> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Bucket: this.bucketName,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Key: objectKey,
      }),
    )

    if (!(response.Body instanceof Readable)) {
      throw new Error(
        `Media object did not return a readable body: ${objectKey}`,
      )
    }
    return response.Body
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
