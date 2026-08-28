import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MediaService } from 'src/media/media.service'
import { In, Repository } from 'typeorm'
import { PlaceImage } from './entities/place-image.entity'
import { PlacePhotoSource } from './enums/place-photo-source.enum'
import type { PlacePhoto } from './photo/place-photo.types'

const TOUR_IMAGE_HOST = 'tong.visitkorea.or.kr'
const TOUR_IMAGE_TIMEOUT_MS = 4_000

@Injectable()
export class PlaceImageService {
  constructor(
    @InjectRepository(PlaceImage)
    private readonly placeImageRepository: Repository<PlaceImage>,
    private readonly mediaService: MediaService,
  ) {}

  async getPrimaryPhotos(placeIds: string[]): Promise<Map<string, PlacePhoto>> {
    if (placeIds.length === 0) {
      return new Map()
    }

    const images = await this.placeImageRepository.find({
      where: { place: { id: In(placeIds) }, isPrimary: true },
      relations: { place: true, mediaAsset: true },
      select: {
        place: { id: true },
        displayOrder: true,
        source: true,
        attributions: true,
        mediaAsset: { objectKey: true },
      },
    })

    return new Map(
      images.map((image) => [
        image.place.id,
        this.toPhoto(image.place.id, image),
      ]),
    )
  }

  async getPhotos(placeId: string): Promise<PlacePhoto[]> {
    const images = await this.placeImageRepository.find({
      where: { place: { id: placeId } },
      relations: { mediaAsset: true },
      select: {
        displayOrder: true,
        source: true,
        attributions: true,
        mediaAsset: { objectKey: true },
      },
      order: { displayOrder: 'ASC' },
    })
    if (images.length === 0) {
      return []
    }

    return images.map((image) => this.toPhoto(placeId, image))
  }

  async cacheTourPhotos(
    placeId: string,
    photos: PlacePhoto[],
  ): Promise<PlacePhoto[]> {
    if (
      photos.length === 0 ||
      !photos.every((photo) => this.isTourPhoto(photo))
    ) {
      return photos
    }

    const images: PlaceImage[] = []
    for (const photo of photos) {
      const response = await fetch(photo.url, {
        redirect: 'error',
        signal: AbortSignal.timeout(TOUR_IMAGE_TIMEOUT_MS),
      })
      if (!response.ok) throw new Error('TourAPI image download failed')

      const stored = await this.mediaService.storePublicImage({
        body: new Uint8Array(await response.arrayBuffer()),
        mimeType: response.headers.get('content-type')?.split(';')[0] ?? '',
        sourceUrl: photo.url,
      })
      images.push(
        this.placeImageRepository.create({
          place: { id: placeId },
          mediaAsset: stored.asset,
          displayOrder: images.length + 1,
          isPrimary: images.length === 0,
          source: photo.source,
          attributions: photo.attributions,
        }),
      )
    }

    const saved = await this.placeImageRepository.save(images)
    return saved.map((image) => this.toPhoto(placeId, image))
  }

  private isTourPhoto(photo: PlacePhoto): boolean {
    try {
      const url = new URL(photo.url)
      return (
        photo.source === PlacePhotoSource.Tour &&
        url.protocol === 'https:' &&
        url.hostname === TOUR_IMAGE_HOST
      )
    } catch {
      return false
    }
  }

  private toPhoto(
    placeId: string,
    image: Pick<
      PlaceImage,
      'displayOrder' | 'source' | 'attributions' | 'mediaAsset'
    >,
  ): PlacePhoto {
    return {
      id: `${image.source.toLowerCase()}:${placeId}:${image.displayOrder}`,
      url: this.mediaService.getPublicUrl(image.mediaAsset.objectKey),
      width: null,
      height: null,
      source: image.source,
      attributions: image.attributions,
      googleMapsUri: null,
      flagContentUri: null,
    }
  }
}
