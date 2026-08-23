import { Readable } from 'node:stream'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Inject, Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MetricsService } from 'src/common/observability/metrics.service'
import type { MimeType } from '../common/enums/mime-type.enum'
import type { Env } from '../config/env'

const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export type StoredMediaObject = {
  objectKey: string
  lastModified: Date | null
}

export type StoredMediaObjectPage = {
  objects: StoredMediaObject[]
  continuationToken?: string
}

@Injectable()
export class MediaStorageService {
  private readonly bucketName: string
  private readonly publicBaseUrl: string

  constructor(
    @Inject('S3_CLIENT') private readonly s3Client: S3Client,
    config: ConfigService<Env, true>,
    @Optional() private readonly metrics?: MetricsService,
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

  uploadImage(
    objectKey: string,
    body: Uint8Array,
    mimeType: MimeType,
  ): Promise<void> {
    if (!this.metrics) {
      return this.uploadImageToStorage(objectKey, body, mimeType)
    }

    return this.metrics.observeExternal(
      'oci_object_storage',
      'upload_image',
      () => this.uploadImageToStorage(objectKey, body, mimeType),
    )
  }

  private async uploadImageToStorage(
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

  deleteObject(objectKey: string): Promise<void> {
    if (!this.metrics) return this.deleteObjectFromStorage(objectKey)

    return this.metrics.observeExternal(
      'oci_object_storage',
      'delete_object',
      () => this.deleteObjectFromStorage(objectKey),
    )
  }

  private async deleteObjectFromStorage(objectKey: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Bucket: this.bucketName,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Key: objectKey,
      }),
    )
  }

  listObjects(
    prefix: string,
    continuationToken?: string,
  ): Promise<StoredMediaObjectPage> {
    if (!this.metrics) {
      return this.listObjectsFromStorage(prefix, continuationToken)
    }

    return this.metrics.observeExternal(
      'oci_object_storage',
      'list_objects',
      () => this.listObjectsFromStorage(prefix, continuationToken),
    )
  }

  private async listObjectsFromStorage(
    prefix: string,
    continuationToken?: string,
  ): Promise<StoredMediaObjectPage> {
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Bucket: this.bucketName,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        Prefix: prefix,
        // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
        ContinuationToken: continuationToken,
      }),
    )

    return {
      objects: (response.Contents ?? []).flatMap((object) =>
        object.Key
          ? [
              {
                objectKey: object.Key,
                lastModified: object.LastModified ?? null,
              },
            ]
          : [],
      ),
      ...(response.IsTruncated && response.NextContinuationToken
        ? { continuationToken: response.NextContinuationToken }
        : {}),
    }
  }

  downloadObject(objectKey: string): Promise<Readable> {
    if (!this.metrics) return this.downloadObjectFromStorage(objectKey)

    return this.metrics.observeExternal(
      'oci_object_storage',
      'download_object',
      () => this.downloadObjectFromStorage(objectKey),
    )
  }

  private async downloadObjectFromStorage(
    objectKey: string,
  ): Promise<Readable> {
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
