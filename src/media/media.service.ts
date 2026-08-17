import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { MediaAsset } from '../common/entities/media-asset.entity'
import { MimeType } from '../common/enums/mime-type.enum'
import { CommonException } from '../common/exception/common.exception'
import { CommonErrorCode } from '../common/exception/common-error-code'
import { MediaStorageService } from './media-storage.service'

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

const IMAGE_EXTENSIONS: Record<MimeType, string> = {
  [MimeType.Jpeg]: 'jpg',
  [MimeType.Png]: 'png',
  [MimeType.Webp]: 'webp',
}

export type StorePublicImageInput = {
  body: Uint8Array
  mimeType: string
  sourceUrl?: string
}

export type StoredPublicImage = {
  asset: MediaAsset
  publicUrl: string
}

export type DownloadedPublicImage = {
  body: Readable
  mimeType: MimeType
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)

  constructor(
    @InjectRepository(MediaAsset)
    private readonly mediaAssetRepository: Repository<MediaAsset>,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  async storePublicImage(
    input: StorePublicImageInput,
  ): Promise<StoredPublicImage> {
    const mimeType = this.validateImage(input.body, input.mimeType)

    if (input.sourceUrl) {
      const existingAsset = await this.mediaAssetRepository.findOne({
        where: { sourceUrl: input.sourceUrl },
      })
      if (existingAsset) return this.toStoredImage(existingAsset)
    }

    const objectKey = this.createObjectKey(mimeType)
    try {
      await this.mediaStorage.uploadImage(objectKey, input.body, mimeType)
    } catch {
      throw new CommonException(CommonErrorCode.externalServiceError)
    }

    const asset = this.mediaAssetRepository.create({
      objectKey,
      mimeType,
      ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    })

    try {
      const savedAsset = await this.mediaAssetRepository.save(asset)
      return this.toStoredImage(savedAsset)
    } catch (error) {
      await this.compensateUpload(objectKey)
      throw error
    }
  }

  getBucketName(): string {
    return this.mediaStorage.getBucketName()
  }

  getPublicUrl(objectKey: string): string {
    return this.mediaStorage.getPublicUrl(objectKey)
  }

  async downloadPublicImage(objectKey: string): Promise<DownloadedPublicImage> {
    const asset = await this.mediaAssetRepository.findOne({
      where: { objectKey },
    })
    if (!asset) {
      throw new CommonException(CommonErrorCode.resourceNotFound)
    }

    try {
      return {
        body: await this.mediaStorage.downloadObject(objectKey),
        mimeType: asset.mimeType,
      }
    } catch {
      throw new CommonException(CommonErrorCode.externalServiceError)
    }
  }

  async discardStoredImage(asset: MediaAsset): Promise<void> {
    try {
      await this.mediaAssetRepository.remove(asset)
    } catch (error) {
      this.logCompensationError(
        `Failed to remove unpublished media asset: ${asset.objectKey}`,
        error,
      )
      return
    }

    try {
      await this.mediaStorage.deleteObject(asset.objectKey)
    } catch (error) {
      this.logCompensationError(
        `Failed to delete unpublished media object: ${asset.objectKey}`,
        error,
      )
    }
  }

  async checkStorageHealth(): Promise<boolean> {
    return await this.mediaStorage.checkHealth()
  }

  private validateImage(body: Uint8Array, mimeType: string): MimeType {
    if (!Object.values(MimeType).includes(mimeType as MimeType)) {
      throw this.imageValidationError(
        `지원하지 않는 이미지 MIME 형식입니다: ${mimeType}`,
      )
    }
    if (body.byteLength > MAX_IMAGE_SIZE_BYTES) {
      throw this.imageValidationError(
        '이미지는 최대 10 MiB까지 업로드할 수 있습니다.',
      )
    }
    if (!this.hasImageSignature(body, mimeType as MimeType)) {
      throw this.imageValidationError(
        `파일 내용이 선언된 MIME 형식(${mimeType})과 일치하지 않습니다.`,
      )
    }
    return mimeType as MimeType
  }

  private hasImageSignature(body: Uint8Array, mimeType: MimeType): boolean {
    switch (mimeType) {
      case MimeType.Jpeg:
        return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff
      case MimeType.Png:
        return (
          body[0] === 0x89 &&
          body[1] === 0x50 &&
          body[2] === 0x4e &&
          body[3] === 0x47 &&
          body[4] === 0x0d &&
          body[5] === 0x0a &&
          body[6] === 0x1a &&
          body[7] === 0x0a
        )
      case MimeType.Webp:
        return (
          body[0] === 0x52 &&
          body[1] === 0x49 &&
          body[2] === 0x46 &&
          body[3] === 0x46 &&
          body[8] === 0x57 &&
          body[9] === 0x45 &&
          body[10] === 0x42 &&
          body[11] === 0x50
        )
    }
  }

  private imageValidationError(reason: string): CommonException {
    return new CommonException(CommonErrorCode.validationError, [
      { field: 'file', reason },
    ])
  }

  private createObjectKey(mimeType: MimeType): string {
    const [year, month] = new Date().toISOString().split('-')
    return `media/${year}/${month}/${randomUUID()}.${IMAGE_EXTENSIONS[mimeType]}`
  }

  private toStoredImage(asset: MediaAsset): StoredPublicImage {
    return {
      asset,
      publicUrl: this.mediaStorage.getPublicUrl(asset.objectKey),
    }
  }

  private async compensateUpload(objectKey: string): Promise<void> {
    try {
      await this.mediaStorage.deleteObject(objectKey)
    } catch (error) {
      this.logCompensationError(
        `Failed to delete media object after database failure: ${objectKey}`,
        error,
      )
    }
  }

  private logCompensationError(message: string, error: unknown): void {
    const detail = error instanceof Error ? error.stack : String(error)
    this.logger.error(message, detail)
  }
}
