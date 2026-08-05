import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { parseWithZod } from '../common/pipes/zod-validation.pipe'
import type { Env } from '../config/env'
import {
  DEFAULT_DOWNLOAD_URL_EXPIRES_IN,
  DEFAULT_UPLOAD_URL_EXPIRES_IN,
  deleteObjectRequestSchema,
  getDownloadUrlRequestSchema,
  getPublicUrlRequestSchema,
  getUploadUrlRequestSchema,
} from './schemas/storage-request.schema'

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

  async getPresignedUploadUrl(
    key: string,
    contentType?: string,
    expiresIn = DEFAULT_UPLOAD_URL_EXPIRES_IN,
  ): Promise<string> {
    const request = parseWithZod(getUploadUrlRequestSchema, {
      key,
      contentType,
      expiresIn,
    })
    const command = new PutObjectCommand({
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Bucket: this.bucketName,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Key: request.key,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      ContentType: request.contentType,
    })
    return await getSignedUrl(this.s3Client, command, {
      expiresIn: request.expiresIn ?? DEFAULT_UPLOAD_URL_EXPIRES_IN,
    })
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresIn = DEFAULT_DOWNLOAD_URL_EXPIRES_IN,
  ): Promise<string> {
    const request = parseWithZod(getDownloadUrlRequestSchema, {
      key,
      expiresIn,
    })
    const command = new GetObjectCommand({
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Bucket: this.bucketName,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Key: request.key,
    })
    return await getSignedUrl(this.s3Client, command, {
      expiresIn: request.expiresIn ?? DEFAULT_DOWNLOAD_URL_EXPIRES_IN,
    })
  }

  async getPublicUrl(key: string): Promise<string> {
    const request = parseWithZod(getPublicUrlRequestSchema, { key })
    const endpoint = this.s3Client.config.endpoint
    if (!endpoint) {
      throw new Error('S3 endpoint is not configured')
    }
    const resolved = await endpoint()
    const baseUrl = `${resolved.protocol}//${resolved.hostname}${
      resolved.port ? `:${resolved.port}` : ''
    }${resolved.path}`.replace(/\/+$/, '')
    return `${baseUrl}/${this.bucketName}/${request.key}`
  }

  async deleteObject(key: string): Promise<void> {
    const request = parseWithZod(deleteObjectRequestSchema, { key })
    const command = new DeleteObjectCommand({
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Bucket: this.bucketName,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Key: request.key,
    })
    await this.s3Client.send(command)
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
