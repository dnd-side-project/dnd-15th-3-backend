import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import type { ConfigService } from '@nestjs/config'
import { MimeType } from '../common/enums/mime-type.enum'
import type { Env } from '../config/env'
import { MediaStorageService } from './media-storage.service'

const mockSend = jest.fn()

const s3ClientMock = {
  send: mockSend,
}

function createConfig() {
  const values = {
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    MEDIA_BUCKET_NAME: 'momo-media-test',
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    MEDIA_PUBLIC_BASE_URL:
      'https://objectstorage.example/n/name%20space/b/momo-media-test/o/',
  }
  return {
    get: (key: keyof typeof values) => values[key],
  } as unknown as ConfigService<Env, true>
}

describe('MediaStorageService', () => {
  let service: MediaStorageService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new MediaStorageService(s3ClientMock as never, createConfig())
  })

  it('uploads an immutable public image with its content type', async () => {
    mockSend.mockResolvedValue({})
    const body = Buffer.from('image')

    await service.uploadImage('media/2026/08/id.png', body, MimeType.Png)

    const command = mockSend.mock.calls[0][0]
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect(command.input).toMatchObject({
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Bucket: 'momo-media-test',
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Key: 'media/2026/08/id.png',
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Body: body,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      ContentType: MimeType.Png,
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      CacheControl: 'public, max-age=31536000, immutable',
    })
  })

  it('encodes each object key segment when building a public URL', () => {
    expect(service.getPublicUrl('media/한 글/image #1.png')).toBe(
      'https://objectstorage.example/n/name%20space/b/momo-media-test/o/media/%ED%95%9C%20%EA%B8%80/image%20%231.png',
    )
  })

  it('deletes an object for an internal compensation action', async () => {
    mockSend.mockResolvedValue({})

    await service.deleteObject('media/2026/08/id.png')

    const command = mockSend.mock.calls[0][0]
    expect(command).toBeInstanceOf(DeleteObjectCommand)
    expect(command.input).toMatchObject({
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Bucket: 'momo-media-test',
      // biome-ignore lint/style/useNamingConvention: AWS SDK S3 API property name
      Key: 'media/2026/08/id.png',
    })
  })

  it('reports storage health without throwing', async () => {
    mockSend.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('down'))

    await expect(service.checkHealth()).resolves.toBe(true)
    expect(mockSend.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand)
    await expect(service.checkHealth()).resolves.toBe(false)
  })
})
