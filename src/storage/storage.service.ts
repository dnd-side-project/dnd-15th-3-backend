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
import { CommonException } from '../common/exception/common.exception'
import { CommonErrorCode } from '../common/exception/common-error-code'
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

  async getPresignedUploadUrl(
    key: string,
    contentType?: string,
    expiresIn = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Bucket: this.bucketName,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Key: key,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      ContentType: contentType,
    })
    return await getSignedUrl(this.s3Client, command, { expiresIn })
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Bucket: this.bucketName,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Key: key,
    })
    return await getSignedUrl(this.s3Client, command, { expiresIn })
  }

  async getPublicUrl(key: string): Promise<string> {
    const endpoint = this.s3Client.config.endpoint
    if (!endpoint) {
      throw new CommonException(CommonErrorCode.serviceUnavailable)
    }
    const resolved = await endpoint()
    const baseUrl = `${resolved.protocol}//${resolved.hostname}${
      resolved.port ? `:${resolved.port}` : ''
    }${resolved.path}`.replace(/\/+$/, '')
    return `${baseUrl}/${this.bucketName}/${key}`
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Bucket: this.bucketName,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Key: key,
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
