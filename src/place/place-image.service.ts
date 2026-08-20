import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MediaService } from 'src/media/media.service'
import { In, Repository } from 'typeorm'
import { PlaceImage } from './entities/place-image.entity'

@Injectable()
export class PlaceImageService {
  constructor(
    @InjectRepository(PlaceImage)
    private readonly placeImageRepository: Repository<PlaceImage>,
    private readonly mediaService: MediaService,
  ) {}

  async getPrimaryImageUrls(placeIds: string[]): Promise<Map<string, string>> {
    if (placeIds.length === 0) {
      return new Map()
    }

    const images = await this.placeImageRepository.find({
      where: { place: { id: In(placeIds) }, isPrimary: true },
      relations: { place: true, mediaAsset: true },
      select: {
        place: { id: true },
        mediaAsset: { objectKey: true },
      },
    })
    const urls = await this.resolveDownloadUrls(images)

    return new Map(images.map((image, index) => [image.place.id, urls[index]]))
  }

  async getImageUrls(placeId: string): Promise<string[]> {
    const images = await this.placeImageRepository.find({
      where: { place: { id: placeId } },
      relations: { mediaAsset: true },
      select: { displayOrder: true, mediaAsset: { objectKey: true } },
      order: { displayOrder: 'ASC' },
    })
    if (images.length === 0) {
      return []
    }

    return await this.resolveDownloadUrls(images)
  }

  private resolveDownloadUrls(
    images: Array<Pick<PlaceImage, 'mediaAsset'>>,
  ): Promise<string[]> {
    return Promise.all(
      images.map((image) =>
        this.mediaService.getPublicUrl(image.mediaAsset.objectKey),
      ),
    )
  }
}
