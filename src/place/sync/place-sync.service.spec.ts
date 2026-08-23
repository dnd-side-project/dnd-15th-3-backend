import { PlaceSource } from '../enums/place-source.enum'
import { PlaceSyncJobStatus } from '../enums/place-sync-job-status.enum'
import { PlaceSyncService } from './place-sync.service'

function createService() {
  const jobRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  }
  const coverageRepository = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    save: jest.fn(),
  }
  const placeEntityRepository = {
    upsert: jest.fn(),
  }
  const dataSource = {
    query: jest.fn().mockResolvedValue([{ id: 'lease-1' }]),
  }
  const provider = {
    source: PlaceSource.Google,
    supportsCategory: jest.fn().mockReturnValue(true),
    searchNearby: jest.fn(),
  }

  return {
    service: new PlaceSyncService(
      jobRepository as never,
      coverageRepository as never,
      placeEntityRepository as never,
      dataSource as never,
      provider,
    ),
    jobRepository,
    coverageRepository,
    placeEntityRepository,
    dataSource,
    provider,
  }
}

describe('PlaceSyncService', () => {
  it('작업 상태를 사용자 수집 상태로 집계한다', async () => {
    const { service, jobRepository } = createService()
    const completedAt = new Date('2026-08-08T00:00:00.000Z')
    jobRepository.find.mockResolvedValue([
      { status: PlaceSyncJobStatus.Completed, completedAt },
      { status: PlaceSyncJobStatus.Failed, completedAt: null },
    ])

    await expect(service.getStatus('1', 1)).resolves.toEqual({
      status: 'PARTIAL',
      lastSyncedAt: completedAt,
    })
  })

  it('coverage가 없는 tile만 Provider를 호출하고 완료 coverage를 기록한다', async () => {
    const {
      service,
      jobRepository,
      coverageRepository,
      placeEntityRepository,
      provider,
    } = createService()
    jobRepository.findOne.mockResolvedValue({
      id: 'job-1',
      source: PlaceSource.Google,
      locationVersion: 1,
      radiusMeters: 1,
      attemptCount: 1,
      resultCount: 0,
      center: { type: 'Point', coordinates: [127, 37.5] },
      category: { id: '1', slug: 'cafe' },
    })
    coverageRepository.findOne.mockResolvedValue(null)
    provider.searchNearby.mockResolvedValue({
      places: [
        {
          providerPlaceId: 'google-place-1',
          name: '카페',
          address: '서울 주소',
          roadAddress: '서울 도로명 주소',
          latitude: 37.5,
          longitude: 127,
          phone: null,
          placeUrl: null,
          providerCategoryCode: 'cafe',
        },
      ],
      isComplete: true,
    })

    await service.processJob('job-1')

    expect(provider.searchNearby).toHaveBeenCalled()
    expect(placeEntityRepository.upsert).toHaveBeenCalled()
    expect(placeEntityRepository.upsert.mock.calls[0][0][0]).not.toHaveProperty(
      'previewUrl',
    )
    expect(coverageRepository.save).toHaveBeenCalled()
    expect(jobRepository.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: PlaceSyncJobStatus.Completed }),
    )
  })

  it('Provider가 지원하지 않는 카테고리는 tile 조회 없이 완료한다', async () => {
    const { service, jobRepository, coverageRepository, provider } =
      createService()
    provider.supportsCategory.mockReturnValue(false)
    jobRepository.findOne.mockResolvedValue({
      id: 'job-1',
      source: PlaceSource.Google,
      locationVersion: 1,
      radiusMeters: 1,
      attemptCount: 1,
      resultCount: 0,
      center: { type: 'Point', coordinates: [127, 37.5] },
      category: { id: '1', slug: 'other' },
    })

    await service.processJob('job-1')

    expect(provider.searchNearby).not.toHaveBeenCalled()
    expect(coverageRepository.findOne).not.toHaveBeenCalled()
    expect(jobRepository.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: PlaceSyncJobStatus.Completed }),
    )
  })

  it('Provider 오류는 재시도 가능한 PENDING 작업으로 되돌린다', async () => {
    const { service, jobRepository, coverageRepository, provider } =
      createService()
    jobRepository.findOne.mockResolvedValue({
      id: 'job-1',
      source: PlaceSource.Google,
      locationVersion: 1,
      radiusMeters: 1,
      attemptCount: 1,
      resultCount: 0,
      center: { type: 'Point', coordinates: [127, 37.5] },
      category: { id: '1', slug: 'cafe' },
    })
    coverageRepository.findOne.mockResolvedValue(null)
    provider.searchNearby.mockRejectedValue(new Error('rate limited'))

    await service.processJob('job-1')

    expect(jobRepository.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: PlaceSyncJobStatus.Pending,
        errorMessage: 'rate limited',
      }),
    )
  })

  it('최대 결과 수에 도달한 tile은 한 번 분할 조회한 뒤 coverage를 기록한다', async () => {
    const { service, jobRepository, coverageRepository, provider } =
      createService()
    jobRepository.findOne.mockResolvedValue({
      id: 'job-1',
      source: PlaceSource.Google,
      locationVersion: 1,
      radiusMeters: 1,
      attemptCount: 1,
      resultCount: 0,
      center: { type: 'Point', coordinates: [127, 37.5] },
      category: { id: '1', slug: 'cafe' },
    })
    coverageRepository.findOne.mockResolvedValue(null)
    provider.searchNearby.mockImplementation(({ radiusMeters }) =>
      Promise.resolve({
        places: [],
        isComplete: radiusMeters < 750,
      }),
    )

    await service.processJob('job-1')

    expect(provider.searchNearby).toHaveBeenCalledWith(
      expect.objectContaining({ radiusMeters: 750 }),
    )
    expect(provider.searchNearby).toHaveBeenCalledWith(
      expect.objectContaining({ radiusMeters: 375 }),
    )
    expect(coverageRepository.save).toHaveBeenCalled()
  })

  it('다른 worker가 tile lease를 보유하면 외부 Provider를 호출하지 않고 재시도한다', async () => {
    const { service, jobRepository, coverageRepository, dataSource, provider } =
      createService()
    dataSource.query.mockResolvedValue([])
    jobRepository.findOne.mockResolvedValue({
      id: 'job-1',
      source: PlaceSource.Google,
      locationVersion: 1,
      radiusMeters: 1,
      attemptCount: 1,
      resultCount: 0,
      center: { type: 'Point', coordinates: [127, 37.5] },
      category: { id: '1', slug: 'cafe' },
    })
    coverageRepository.findOne.mockResolvedValue(null)

    await service.processJob('job-1')

    expect(provider.searchNearby).not.toHaveBeenCalled()
    expect(jobRepository.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: PlaceSyncJobStatus.Pending }),
    )
  })

  it('세 번째 실패는 더 이상 재시도하지 않는다', async () => {
    const { service, jobRepository, coverageRepository, provider } =
      createService()
    jobRepository.findOne.mockResolvedValue({
      id: 'job-1',
      source: PlaceSource.Google,
      locationVersion: 1,
      radiusMeters: 1,
      attemptCount: 3,
      resultCount: 0,
      center: { type: 'Point', coordinates: [127, 37.5] },
      category: { id: '1', slug: 'cafe' },
    })
    coverageRepository.findOne.mockResolvedValue(null)
    provider.searchNearby.mockRejectedValue(new Error('rate limited'))

    await service.processJob('job-1')

    expect(jobRepository.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: PlaceSyncJobStatus.Failed }),
    )
  })

  it('신선한 coverage tile은 외부 Provider를 다시 호출하지 않는다', async () => {
    const { service, jobRepository, coverageRepository, provider } =
      createService()
    jobRepository.findOne.mockResolvedValue({
      id: 'job-1',
      source: PlaceSource.Google,
      locationVersion: 1,
      radiusMeters: 1,
      attemptCount: 1,
      resultCount: 0,
      center: { type: 'Point', coordinates: [127, 37.5] },
      category: { id: '1', slug: 'cafe' },
    })
    coverageRepository.findOne.mockResolvedValue({
      lastSyncedAt: new Date(),
    })

    await service.processJob('job-1')

    expect(provider.searchNearby).not.toHaveBeenCalled()
    expect(jobRepository.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: PlaceSyncJobStatus.Completed }),
    )
  })
})
