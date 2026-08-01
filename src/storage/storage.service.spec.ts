import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'
import { StorageService } from './storage.service'

jest.mock('@aws-sdk/s3-request-presigner')

const mockGetSignedUrl = getSignedUrl as jest.Mock
const mockSend = jest.fn()

const s3ClientMock = {
  send: mockSend,
  config: {
    endpoint: () =>
      Promise.resolve({
        protocol: 'https:',
        hostname: 'ns.compat.objectstorage.ap-hyderabad-1.oraclecloud.com',
        port: undefined,
        path: '/',
      }),
  },
}

function createConfig(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    get: (key: string) =>
      ({
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        NODE_ENV: 'development',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        OCI_BUCKET_NAME_DEV: 'momo-bucket-dev',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        OCI_BUCKET_NAME_PROD: 'momo-bucket-prod',
        ...overrides,
      })[key],
  } as unknown as ConfigService<Env, true>
}

describe('StorageService', () => {
  let service: StorageService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new StorageService(s3ClientMock as never, createConfig())
  })

  describe('getBucketName', () => {
    it('returns the dev bucket when NODE_ENV is development', () => {
      expect(service.getBucketName()).toBe('momo-bucket-dev')
    })

    it('returns the prod bucket when NODE_ENV is production', () => {
      service = new StorageService(
        s3ClientMock as never,
        createConfig({
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          NODE_ENV: 'production',
        }),
      )
      expect(service.getBucketName()).toBe('momo-bucket-prod')
    })
  })

  describe('getPresignedUploadUrl', () => {
    it('generates a signed URL with the given key and expiry', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-upload-url')
      const url = await service.getPresignedUploadUrl(
        'uploads/a.png',
        'image/png',
        600,
      )
      expect(url).toBe('https://signed-upload-url')
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1)
      const [client, command, options] = mockGetSignedUrl.mock.calls[0]
      expect(client).toBe(s3ClientMock)
      expect(options.expiresIn).toBe(600)
      expect(command.input.Bucket).toBe('momo-bucket-dev')
      expect(command.input.Key).toBe('uploads/a.png')
      expect(command.input.ContentType).toBe('image/png')
    })

    it('defaults expiresIn to 300', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-upload-url')
      await service.getPresignedUploadUrl('uploads/a.png')
      const options = mockGetSignedUrl.mock.calls[0][2]
      expect(options.expiresIn).toBe(300)
    })
  })

  describe('getPresignedDownloadUrl', () => {
    it('generates a signed GET URL with default expiry 3600', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-download-url')
      const url = await service.getPresignedDownloadUrl('uploads/a.png')
      expect(url).toBe('https://signed-download-url')
      const [client, command, options] = mockGetSignedUrl.mock.calls[0]
      expect(client).toBe(s3ClientMock)
      expect(command.input.Key).toBe('uploads/a.png')
      expect(options.expiresIn).toBe(3600)
    })
  })

  describe('getPublicUrl', () => {
    it('builds the public URL from the endpoint and bucket', async () => {
      const url = await service.getPublicUrl('uploads/a.png')
      expect(url).toBe(
        'https://ns.compat.objectstorage.ap-hyderabad-1.oraclecloud.com/momo-bucket-dev/uploads/a.png',
      )
    })
  })

  describe('deleteObject', () => {
    it('sends a DeleteObjectCommand for the given key', async () => {
      mockSend.mockResolvedValue({})
      await service.deleteObject('uploads/a.png')
      expect(mockSend).toHaveBeenCalledTimes(1)
      const command = mockSend.mock.calls[0][0]
      expect(command).toBeInstanceOf(DeleteObjectCommand)
      expect(command.input.Bucket).toBe('momo-bucket-dev')
      expect(command.input.Key).toBe('uploads/a.png')
    })
  })

  describe('checkHealth', () => {
    it('returns true when HeadBucket succeeds', async () => {
      mockSend.mockResolvedValue({})
      await expect(service.checkHealth()).resolves.toBe(true)
    })

    it('returns false when HeadBucket fails', async () => {
      mockSend.mockRejectedValue(new Error('bucket not found'))
      await expect(service.checkHealth()).resolves.toBe(false)
    })
  })
})
