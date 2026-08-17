import type { Repository } from 'typeorm'
import type { PlaceImage } from './entities/place-image.entity'
import { PlaceImageService } from './place-image.service'

function createService() {
  const placeImageRepository = {
    find: jest.fn(),
  }
  const storageService = {
    getPresignedDownloadUrl: jest.fn(),
  }

  return {
    service: new PlaceImageService(
      placeImageRepository as unknown as Repository<PlaceImage>,
      storageService as never,
    ),
    placeImageRepository,
    storageService,
  }
}

describe('PlaceImageService', () => {
  describe('getPrimaryImageUrls', () => {
    it('장소 ID가 없으면 저장소를 조회하지 않고 빈 Map을 반환한다', async () => {
      const { service, placeImageRepository } = createService()

      await expect(service.getPrimaryImageUrls([])).resolves.toEqual(new Map())
      expect(placeImageRepository.find).not.toHaveBeenCalled()
    })

    it('대표 이미지만 조회해 장소 ID별 presigned URL Map으로 변환한다', async () => {
      const { service, placeImageRepository, storageService } = createService()
      placeImageRepository.find.mockResolvedValue([
        {
          place: { id: '1' },
          mediaAsset: { objectKey: 'places/1/primary.jpg' },
        },
        {
          place: { id: '2' },
          mediaAsset: { objectKey: 'places/2/primary.jpg' },
        },
      ])
      storageService.getPresignedDownloadUrl
        .mockResolvedValueOnce('https://signed.example.com/1.jpg')
        .mockResolvedValueOnce('https://signed.example.com/2.jpg')

      await expect(service.getPrimaryImageUrls(['1', '2'])).resolves.toEqual(
        new Map([
          ['1', 'https://signed.example.com/1.jpg'],
          ['2', 'https://signed.example.com/2.jpg'],
        ]),
      )
      expect(placeImageRepository.find).toHaveBeenCalledWith({
        where: { place: { id: expect.anything() }, isPrimary: true },
        relations: { place: true, mediaAsset: true },
        select: {
          place: { id: true },
          mediaAsset: { objectKey: true },
        },
      })
    })

    it('대표 이미지가 없는 장소는 결과 Map에 포함되지 않는다', async () => {
      const { service, placeImageRepository } = createService()
      placeImageRepository.find.mockResolvedValue([])

      await expect(service.getPrimaryImageUrls(['1'])).resolves.toEqual(
        new Map(),
      )
    })
  })

  describe('getImageUrls', () => {
    it('이미지가 없으면 presigned URL을 조회하지 않고 빈 배열을 반환한다', async () => {
      const { service, placeImageRepository, storageService } = createService()
      placeImageRepository.find.mockResolvedValue([])

      await expect(service.getImageUrls('1')).resolves.toEqual([])
      expect(storageService.getPresignedDownloadUrl).not.toHaveBeenCalled()
    })

    it('이미지 목록을 표시 순서대로 presigned URL로 변환한다', async () => {
      const { service, placeImageRepository, storageService } = createService()
      placeImageRepository.find.mockResolvedValue([
        { displayOrder: 1, mediaAsset: { objectKey: 'places/1/first.jpg' } },
        { displayOrder: 2, mediaAsset: { objectKey: 'places/1/second.jpg' } },
      ])
      storageService.getPresignedDownloadUrl
        .mockResolvedValueOnce('https://signed.example.com/first.jpg')
        .mockResolvedValueOnce('https://signed.example.com/second.jpg')

      await expect(service.getImageUrls('1')).resolves.toEqual([
        'https://signed.example.com/first.jpg',
        'https://signed.example.com/second.jpg',
      ])
      expect(placeImageRepository.find).toHaveBeenCalledWith({
        where: { place: { id: '1' } },
        relations: { mediaAsset: true },
        select: { displayOrder: true, mediaAsset: { objectKey: true } },
        order: { displayOrder: 'ASC' },
      })
    })
  })
})
