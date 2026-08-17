import { randomUUID } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { MediaAsset } from '../common/entities/media-asset.entity'
import { MimeType } from '../common/enums/mime-type.enum'
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
    await this.mediaStorage.uploadImage(objectKey, input.body, mimeType)

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

  async checkStorageHealth(): Promise<boolean> {
    return await this.mediaStorage.checkHealth()
  }

  private validateImage(body: Uint8Array, mimeType: string): MimeType {
    if (!Object.values(MimeType).includes(mimeType as MimeType)) {
      throw new Error(`Unsupported image MIME type: ${mimeType}`)
    }
    if (body.byteLength > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Image exceeds the 10 MiB size limit')
    }
    return mimeType as MimeType
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
      const detail = error instanceof Error ? error.stack : String(error)
      this.logger.error(
        `Failed to delete media object after database failure: ${objectKey}`,
        detail,
      )
    }
  }
}
