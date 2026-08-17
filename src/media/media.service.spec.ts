import type { Repository } from 'typeorm'
import { MediaAsset } from '../common/entities/media-asset.entity'
import { MimeType } from '../common/enums/mime-type.enum'
import { MediaService } from './media.service'
import type { MediaStorageService } from './media-storage.service'

function createAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return Object.assign(new MediaAsset(), {
    id: '1',
    objectKey: 'media/2026/08/existing.jpg',
    sourceUrl: 'https://source.example/image.jpg',
    mimeType: MimeType.Jpeg,
    createdAt: new Date('2026-08-17T00:00:00Z'),
    updatedAt: new Date('2026-08-17T00:00:00Z'),
    ...overrides,
  })
}

describe('MediaService', () => {
  const repository = {
    findOne: jest.fn(),
    create: jest.fn((value) => Object.assign(new MediaAsset(), value)),
    save: jest.fn(),
  }
  const storage = {
    uploadImage: jest.fn(),
    deleteObject: jest.fn(),
    getPublicUrl: jest.fn((key: string) => `https://media.example/o/${key}`),
    getBucketName: jest.fn(() => 'momo-media-test'),
    checkHealth: jest.fn(),
  }
  let service: MediaService

  beforeEach(() => {
    jest.clearAllMocks()
    repository.findOne.mockResolvedValue(null)
    repository.save.mockImplementation(async (asset) => asset)
    storage.uploadImage.mockResolvedValue(undefined)
    storage.deleteObject.mockResolvedValue(undefined)
    service = new MediaService(
      repository as unknown as Repository<MediaAsset>,
      storage as unknown as MediaStorageService,
    )
  })

  it.each(['image/gif', 'application/octet-stream'])(
    'rejects unsupported MIME type %s before uploading',
    async (mimeType) => {
      await expect(
        service.storePublicImage({ body: Buffer.from('image'), mimeType }),
      ).rejects.toThrow(`Unsupported image MIME type: ${mimeType}`)
      expect(storage.uploadImage).not.toHaveBeenCalled()
    },
  )

  it('rejects an image larger than 10 MiB before uploading', async () => {
    await expect(
      service.storePublicImage({
        body: Buffer.alloc(10 * 1024 * 1024 + 1),
        mimeType: MimeType.Png,
      }),
    ).rejects.toThrow('Image exceeds the 10 MiB size limit')
    expect(storage.uploadImage).not.toHaveBeenCalled()
  })

  it.each([
    [MimeType.Jpeg, 'jpg'],
    [MimeType.Png, 'png'],
    [MimeType.Webp, 'webp'],
  ])(
    'creates an immutable dated UUID key for %s',
    async (mimeType, extension) => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-17T12:00:00Z'))

      const result = await service.storePublicImage({
        body: Buffer.from('image'),
        mimeType,
      })

      expect(result.asset.objectKey).toMatch(
        new RegExp(
          `^media/2026/08/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.${extension}$`,
          'i',
        ),
      )
      expect(storage.uploadImage).toHaveBeenCalledWith(
        result.asset.objectKey,
        expect.any(Buffer),
        mimeType,
      )

      jest.useRealTimers()
    },
  )

  it('returns the existing asset for an already registered source URL', async () => {
    const existing = createAsset()
    repository.findOne.mockResolvedValue(existing)

    await expect(
      service.storePublicImage({
        body: Buffer.from('image'),
        mimeType: MimeType.Jpeg,
        sourceUrl: existing.sourceUrl,
      }),
    ).resolves.toEqual({
      asset: existing,
      publicUrl: `https://media.example/o/${existing.objectKey}`,
    })
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { sourceUrl: existing.sourceUrl },
    })
    expect(storage.uploadImage).not.toHaveBeenCalled()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('deletes the uploaded object when the database save fails', async () => {
    const databaseError = new Error('database unavailable')
    repository.save.mockRejectedValue(databaseError)

    await expect(
      service.storePublicImage({
        body: Buffer.from('image'),
        mimeType: MimeType.Webp,
        sourceUrl: 'https://source.example/new.webp',
      }),
    ).rejects.toBe(databaseError)

    const uploadedKey = storage.uploadImage.mock.calls[0][0]
    expect(storage.deleteObject).toHaveBeenCalledWith(uploadedKey)
  })
})
