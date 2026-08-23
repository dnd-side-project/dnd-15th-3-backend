import type { DataSource } from 'typeorm'
import { PlaceSyncWorker } from './place-sync.worker'

describe('PlaceSyncWorker', () => {
  it('중단된 RUNNING 작업을 복구한 뒤 대기 작업 하나를 처리한다', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[{ id: 'job-1' }], 1]),
    }
    const placeSyncService = {
      processJob: jest.fn().mockResolvedValue(undefined),
    }
    const worker = new PlaceSyncWorker(
      dataSource as unknown as DataSource,
      placeSyncService as never,
    )

    await expect(worker.runOnce()).resolves.toBe(true)

    expect(dataSource.query).toHaveBeenCalledTimes(2)
    expect(dataSource.query.mock.calls[0][0]).toContain(
      '"status" = \'RUNNING\'',
    )
    expect(placeSyncService.processJob).toHaveBeenCalledWith('job-1')
  })

  it('처리할 작업이 없으면 false를 반환한다', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([[], 0]),
    }
    const placeSyncService = { processJob: jest.fn() }
    const worker = new PlaceSyncWorker(
      dataSource as unknown as DataSource,
      placeSyncService as never,
    )

    await expect(worker.runOnce()).resolves.toBe(false)
    expect(placeSyncService.processJob).not.toHaveBeenCalled()
  })
})
