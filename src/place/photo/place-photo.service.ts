import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
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
    const storedPhotos = await this.placeImageService.getPrimaryPhotos(
      uniqueTargets.map((target) => target.id),
    )
    const result = new Map<string, PlacePhoto>()
    for (const target of uniqueTargets) {
      const photo = storedPhotos.get(target.id)
      if (photo) result.set(target.id, photo)
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
    const storedPhotos = await this.placeImageService.getPhotos(target.id)
    if (storedPhotos.length > 0) return storedPhotos
    return await this.findExternalPhotos(target, MAX_DETAIL_PHOTOS)
  }

  private async findExternalPhotos(
    target: PlacePhotoTarget,
    limit: number,
  ): Promise<PlacePhoto[]> {
    if (this.tourPhotoProvider.isConfigured()) {
      try {
        const photos = await this.tourPhotoProvider.findPhotos(target, limit)
        if (photos.length > 0) {
          try {
            return await this.placeImageService.cacheTourPhotos(
              target.id,
              photos,
            )
          } catch {
            // ponytail: 최초 캐시의 동시 경합은 원본 URL로 복구한다. 병목이 확인되면 place별 lock을 추가한다.
            return photos
          }
        }
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
