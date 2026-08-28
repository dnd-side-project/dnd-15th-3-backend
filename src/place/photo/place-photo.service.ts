import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import { PlaceImageService } from '../place-image.service'
import { KakaoImagePhotoProvider } from './kakao-image-photo.provider'
import type { PlacePhoto, PlacePhotoTarget } from './place-photo.types'
import { TourPlacePhotoProvider } from './tour-place-photo.provider'

const MAX_DETAIL_PHOTOS = 5

@Injectable()
export class PlacePhotoService {
  constructor(
    private readonly placeImageService: PlaceImageService,
    private readonly tourPhotoProvider: TourPlacePhotoProvider,
    private readonly kakaoImagePhotoProvider: KakaoImagePhotoProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async findPreviewPhotos(
    targets: PlacePhotoTarget[],
  ): Promise<Map<string, PlacePhoto>> {
    if (targets.length === 0) return new Map()

    const uniqueTargets = [
      ...new Map(targets.map((target) => [target.id, target])).values(),
    ]
    const ownedUrls = await this.placeImageService.getPrimaryImageUrls(
      uniqueTargets.map((target) => target.id),
    )
    const result = new Map<string, PlacePhoto>()
    for (const target of uniqueTargets) {
      const url = ownedUrls.get(target.id)
      if (url) result.set(target.id, this.ownedPhoto(target.id, url, 0))
    }

    await this.forEachConcurrent(
      uniqueTargets.filter((target) => !result.has(target.id)),
      this.config.get('PLACE_PHOTO_PREVIEW_CONCURRENCY', { infer: true }),
      async (target) => {
        const photos = await this.findExternalPhotos(target, 1)
        if (photos[0]) result.set(target.id, photos[0])
      },
    )
    return result
  }

  async findPhotos(target: PlacePhotoTarget): Promise<PlacePhoto[]> {
    const ownedUrls = await this.placeImageService.getImageUrls(target.id)
    if (ownedUrls.length > 0) {
      return ownedUrls.map((url, index) =>
        this.ownedPhoto(target.id, url, index),
      )
    }
    return await this.findExternalPhotos(target, MAX_DETAIL_PHOTOS)
  }

  private async findExternalPhotos(
    target: PlacePhotoTarget,
    limit: number,
  ): Promise<PlacePhoto[]> {
    if (this.tourPhotoProvider.isConfigured()) {
      try {
        const photos = await this.tourPhotoProvider.findPhotos(target, limit)
        if (photos.length > 0) return photos
      } catch {
        // 무료 제공자 장애는 다음 사진 제공자로 넘긴다.
      }
    }
    if (this.kakaoImagePhotoProvider.isConfigured()) {
      try {
        return await this.kakaoImagePhotoProvider.findPhotos(target, limit)
      } catch {
        // 장소 본문은 사진 제공자의 장애와 무관하게 응답해야 한다.
      }
    }
    return []
  }

  private ownedPhoto(placeId: string, url: string, index: number): PlacePhoto {
    return {
      id: `owned:${placeId}:${index + 1}`,
      url,
      width: null,
      height: null,
      source: PlacePhotoSource.Owned,
      attributions: [],
      googleMapsUri: null,
      flagContentUri: null,
    }
  }

  private async forEachConcurrent<T>(
    values: T[],
    concurrency: number,
    task: (value: T) => Promise<void>,
  ): Promise<void> {
    let nextIndex = 0
    const worker = async () => {
      while (nextIndex < values.length) {
        const value = values[nextIndex]
        nextIndex += 1
        await task(value)
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, values.length) }, worker),
    )
  }
}
