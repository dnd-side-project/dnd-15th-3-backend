import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { StorageController } from './storage.controller'
import { StorageService } from './storage.service'

describe('storage validation integration', () => {
  let app: INestApplication
  const storageService = {
    getPresignedUploadUrl: jest
      .fn()
      .mockResolvedValue('https://signed-upload-url'),
    getPresignedDownloadUrl: jest
      .fn()
      .mockResolvedValue('https://signed-download-url'),
    getPublicUrl: jest.fn().mockResolvedValue('https://public-object-url'),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    getBucketName: jest.fn().mockReturnValue('momo-bucket-dev'),
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: storageService }],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects unsafe keys and excessive expiry values with 400', async () => {
    await request(app.getHttpServer())
      .post('/storage/upload-url')
      .send({ key: '../outside.txt', contentType: 'text/plain' })
      .expect(400)

    await request(app.getHttpServer())
      .post('/storage/download-url')
      .send({ key: 'uploads/a.png', expiresIn: 3601 })
      .expect(400)
  })

  it('passes valid requests through while keeping service defaults', async () => {
    await request(app.getHttpServer())
      .post('/storage/upload-url')
      .send({ key: 'uploads/a.png', contentType: 'image/png' })
      .expect(201)

    expect(storageService.getPresignedUploadUrl).toHaveBeenCalledWith(
      'uploads/a.png',
      'image/png',
      undefined,
    )
  })
})
