import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, type Repository } from 'typeorm'
import { MediaAsset } from '../common/entities/media-asset.entity'
import { MimeType } from '../common/enums/mime-type.enum'
import { CommonException } from '../common/exception/common.exception'
import { CommonErrorCode } from '../common/exception/common-error-code'
import { MediaStorageService } from './media-storage.service'

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const MEDIA_OBJECT_PREFIX = 'media/'
const ORPHAN_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000
const CLEANUP_BATCH_SIZE = 100

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

type DiscardableMediaAsset = Pick<MediaAsset, 'id' | 'objectKey'>

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

  async discardStoredImage(asset: DiscardableMediaAsset): Promise<boolean> {
    try {
      await this.mediaStorage.deleteObject(asset.objectKey)
    } catch (error) {
      this.logCompensationError(
        `Failed to delete unpublished media object: ${asset.objectKey}`,
        error,
      )
      return false
    }

    try {
      await this.mediaAssetRepository.delete(asset.id)
    } catch (error) {
      this.logCompensationError(
        `Failed to remove unpublished media asset: ${asset.objectKey}`,
        error,
      )
      return false
    }

    return true
  }

  async reconcileOrphanedMedia(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - ORPHAN_GRACE_PERIOD_MS)
    let cleanedCount = 0

    try {
      cleanedCount += await this.cleanupUnreferencedAssets(cutoff)
    } catch (error) {
      this.logCompensationError(
        'Failed to reconcile unreferenced media assets',
        error,
      )
    }

    try {
      cleanedCount += await this.cleanupUntrackedObjects(cutoff)
    } catch (error) {
      this.logCompensationError(
        'Failed to reconcile untracked media objects',
        error,
      )
    }

    return cleanedCount
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

  private async cleanupUnreferencedAssets(cutoff: Date): Promise<number> {
    const assets = await this.mediaAssetRepository.query<
      DiscardableMediaAsset[]
    >(
      `SELECT asset."id", asset."object_key" AS "objectKey"
       FROM "media_asset" AS asset
       WHERE asset."created_at" < $1
         AND NOT EXISTS (
           SELECT 1 FROM "place_image" AS place_image
           WHERE place_image."media_asset_id" = asset."id"
         )
         AND NOT EXISTS (
           SELECT 1 FROM "meeting" AS meeting
           WHERE meeting."course_image_key" = asset."object_key"
         )
       ORDER BY asset."created_at" ASC, asset."id" ASC
       LIMIT $2`,
      [cutoff, CLEANUP_BATCH_SIZE],
    )

    let cleanedCount = 0
    for (const asset of assets) {
      if (await this.discardStoredImage(asset)) cleanedCount += 1
    }
    return cleanedCount
  }

  private async cleanupUntrackedObjects(cutoff: Date): Promise<number> {
    let cleanedCount = 0
    let continuationToken: string | undefined

    do {
      const page = await this.mediaStorage.listObjects(
        MEDIA_OBJECT_PREFIX,
        continuationToken,
      )
      const candidates = page.objects.filter(
        (object) => object.lastModified && object.lastModified < cutoff,
      )
      const trackedAssets =
        candidates.length === 0
          ? []
          : await this.mediaAssetRepository.find({
              select: { objectKey: true },
              where: {
                objectKey: In(candidates.map((object) => object.objectKey)),
              },
            })
      const trackedKeys = new Set(trackedAssets.map((asset) => asset.objectKey))

      for (const object of candidates) {
        if (trackedKeys.has(object.objectKey)) continue
        try {
          await this.mediaStorage.deleteObject(object.objectKey)
          cleanedCount += 1
        } catch (error) {
          this.logCompensationError(
            `Failed to delete untracked media object: ${object.objectKey}`,
            error,
          )
        }
        if (cleanedCount >= CLEANUP_BATCH_SIZE) return cleanedCount
      }

      continuationToken = page.continuationToken
    } while (continuationToken)

    return cleanedCount
  }

  private logCompensationError(message: string, error: unknown): void {
    const detail = error instanceof Error ? error.stack : String(error)
    this.logger.error(message, detail)
  }
}
