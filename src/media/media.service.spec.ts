import { Readable } from 'node:stream'
import { Logger } from '@nestjs/common'
import type { Repository } from 'typeorm'
import { MediaAsset } from '../common/entities/media-asset.entity'
import { MimeType } from '../common/enums/mime-type.enum'
import { CommonErrorCode } from '../common/exception/common-error-code'
import { MediaService } from './media.service'
import type { MediaStorageService } from './media-storage.service'

const IMAGE_BODIES: Record<MimeType, Buffer> = {
  [MimeType.Jpeg]: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  [MimeType.Png]: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  [MimeType.Webp]: Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]),
}

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
    remove: jest.fn(),
  }
  const storage = {
    uploadImage: jest.fn(),
    deleteObject: jest.fn(),
    downloadObject: jest.fn(),
    getPublicUrl: jest.fn((key: string) => `https://media.example/o/${key}`),
    getBucketName: jest.fn(() => 'momo-media-test'),
    checkHealth: jest.fn(),
  }
  let service: MediaService

  beforeEach(() => {
    jest.clearAllMocks()
    repository.findOne.mockResolvedValue(null)
    repository.save.mockImplementation(async (asset) => asset)
    repository.remove.mockImplementation(async (asset) => asset)
    storage.uploadImage.mockResolvedValue(undefined)
    storage.deleteObject.mockResolvedValue(undefined)
    service = new MediaService(
      repository as unknown as Repository<MediaAsset>,
      storage as unknown as MediaStorageService,
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it.each(['image/gif', 'application/octet-stream'])(
    'rejects unsupported MIME type %s before uploading',
    async (mimeType) => {
      await expect(
        service.storePublicImage({ body: Buffer.from('image'), mimeType }),
      ).rejects.toMatchObject({
        errorCode: CommonErrorCode.validationError,
        fieldErrors: [
          {
            field: 'file',
            reason: `지원하지 않는 이미지 MIME 형식입니다: ${mimeType}`,
          },
        ],
      })
      expect(storage.uploadImage).not.toHaveBeenCalled()
    },
  )

  it('rejects an image larger than 10 MiB before uploading', async () => {
    await expect(
      service.storePublicImage({
        body: Buffer.alloc(10 * 1024 * 1024 + 1),
        mimeType: MimeType.Png,
      }),
    ).rejects.toMatchObject({
      errorCode: CommonErrorCode.validationError,
      fieldErrors: [
        {
          field: 'file',
          reason: '이미지는 최대 10 MiB까지 업로드할 수 있습니다.',
        },
      ],
    })
    expect(storage.uploadImage).not.toHaveBeenCalled()
  })

  it.each([
    [MimeType.Jpeg, IMAGE_BODIES[MimeType.Png]],
    [MimeType.Png, IMAGE_BODIES[MimeType.Webp]],
    [MimeType.Webp, IMAGE_BODIES[MimeType.Jpeg]],
  ])(
    'rejects bytes that do not match declared MIME type %s',
    async (mimeType, body) => {
      await expect(
        service.storePublicImage({ body, mimeType }),
      ).rejects.toMatchObject({
        errorCode: CommonErrorCode.validationError,
        fieldErrors: [
          {
            field: 'file',
            reason: `파일 내용이 선언된 MIME 형식(${mimeType})과 일치하지 않습니다.`,
          },
        ],
      })
      expect(storage.uploadImage).not.toHaveBeenCalled()
    },
  )

  it.each([
    [MimeType.Jpeg, 'jpg'],
    [MimeType.Png, 'png'],
    [MimeType.Webp, 'webp'],
  ])(
    'creates an immutable dated UUID key for %s',
    async (mimeType, extension) => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-17T12:00:00Z'))

      const result = await service.storePublicImage({
        body: IMAGE_BODIES[mimeType],
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
        body: IMAGE_BODIES[MimeType.Jpeg],
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
        body: IMAGE_BODIES[MimeType.Webp],
        mimeType: MimeType.Webp,
        sourceUrl: 'https://source.example/new.webp',
      }),
    ).rejects.toBe(databaseError)

    const uploadedKey = storage.uploadImage.mock.calls[0][0]
    expect(storage.deleteObject).toHaveBeenCalledWith(uploadedKey)
  })

  it('does not mask a database failure when upload compensation also fails', async () => {
    const databaseError = new Error('database unavailable')
    repository.save.mockRejectedValue(databaseError)
    storage.deleteObject.mockRejectedValue(new Error('storage unavailable'))
    jest.spyOn(Logger.prototype, 'error').mockImplementation()

    await expect(
      service.storePublicImage({
        body: IMAGE_BODIES[MimeType.Png],
        mimeType: MimeType.Png,
      }),
    ).rejects.toBe(databaseError)
  })

  it('translates an upload failure to an external service error', async () => {
    storage.uploadImage.mockRejectedValue(new Error('storage unavailable'))

    await expect(
      service.storePublicImage({
        body: IMAGE_BODIES[MimeType.Png],
        mimeType: MimeType.Png,
      }),
    ).rejects.toMatchObject({
      errorCode: CommonErrorCode.externalServiceError,
    })
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('builds a public URL for a known object key', () => {
    expect(service.getPublicUrl('media/2026/08/image.png')).toBe(
      'https://media.example/o/media/2026/08/image.png',
    )
  })

  it('downloads an image stream with the persisted MIME type', async () => {
    const asset = createAsset({ mimeType: MimeType.Webp })
    const body = Readable.from(IMAGE_BODIES[MimeType.Webp])
    repository.findOne.mockResolvedValue(asset)
    storage.downloadObject.mockResolvedValue(body)

    await expect(service.downloadPublicImage(asset.objectKey)).resolves.toEqual(
      {
        body,
        mimeType: MimeType.Webp,
      },
    )
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { objectKey: asset.objectKey },
    })
    expect(storage.downloadObject).toHaveBeenCalledWith(asset.objectKey)
  })

  it('rejects a download for an unregistered object key', async () => {
    await expect(
      service.downloadPublicImage('media/2026/08/missing.png'),
    ).rejects.toMatchObject({ errorCode: CommonErrorCode.resourceNotFound })
    expect(storage.downloadObject).not.toHaveBeenCalled()
  })

  it('translates an object download failure to an external service error', async () => {
    const asset = createAsset()
    repository.findOne.mockResolvedValue(asset)
    storage.downloadObject.mockRejectedValue(new Error('storage unavailable'))

    await expect(
      service.downloadPublicImage(asset.objectKey),
    ).rejects.toMatchObject({ errorCode: CommonErrorCode.externalServiceError })
  })

  it('removes an unpublished asset before deleting its object', async () => {
    const asset = createAsset()

    await expect(service.discardStoredImage(asset)).resolves.toBeUndefined()

    expect(repository.remove).toHaveBeenCalledWith(asset)
    expect(storage.deleteObject).toHaveBeenCalledWith(asset.objectKey)
    expect(repository.remove.mock.invocationCallOrder[0]).toBeLessThan(
      storage.deleteObject.mock.invocationCallOrder[0],
    )
  })

  it('keeps the object when removing the unpublished database record fails', async () => {
    const asset = createAsset()
    repository.remove.mockRejectedValue(new Error('database unavailable'))
    jest.spyOn(Logger.prototype, 'error').mockImplementation()

    await expect(service.discardStoredImage(asset)).resolves.toBeUndefined()
    expect(storage.deleteObject).not.toHaveBeenCalled()
  })

  it('does not surface an object deletion failure during discard', async () => {
    const asset = createAsset()
    storage.deleteObject.mockRejectedValue(new Error('storage unavailable'))
    jest.spyOn(Logger.prototype, 'error').mockImplementation()

    await expect(service.discardStoredImage(asset)).resolves.toBeUndefined()
  })
})
