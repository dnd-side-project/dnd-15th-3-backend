import { StatisticsOutboxWorker } from './statistics-outbox.worker'

function createWorker(options?: {
  lockAcquired?: boolean
  event?: Record<string, unknown>
  processorError?: Error
}) {
  const query = jest
    .fn()
    .mockResolvedValueOnce([{ acquired: options?.lockAcquired ?? true }])
  if (options?.lockAcquired !== false) {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce(
      options?.event
        ? [options.event]
        : [
            {
              id: '50',
              eventType: 'COURSE_CONFIRMED',
              payload: {},
              attemptCount: 1,
            },
          ],
    )
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([])
  }
  const queryRunner = {
    connect: jest.fn(),
    query,
    release: jest.fn(),
  }
  const coreDataSource = { createQueryRunner: () => queryRunner }
  const processor = {
    process: options?.processorError
      ? jest.fn().mockRejectedValue(options.processorError)
      : jest.fn().mockResolvedValue(undefined),
  }
  return {
    worker: new StatisticsOutboxWorker(
      coreDataSource as never,
      processor as never,
    ),
    processor,
    queryRunner,
  }
}

describe('StatisticsOutboxWorker', () => {
  it('이벤트를 선점해 처리하고 PROCESSED로 변경한다', async () => {
    const { worker, processor, queryRunner } = createWorker()

    await expect(worker.runOnce()).resolves.toBe(true)

    expect(processor.process).toHaveBeenCalledWith(
      expect.objectContaining({ id: '50', eventType: 'COURSE_CONFIRMED' }),
    )
    expect(queryRunner.query.mock.calls[3][0]).toContain("'PROCESSED'")
    expect(queryRunner.query.mock.calls[4][0]).toContain(
      'pg_advisory_unlock_shared',
    )
    expect(queryRunner.release).toHaveBeenCalled()
  })

  it('처리 실패를 재시도 가능한 FAILED로 저장한다', async () => {
    const { worker, queryRunner } = createWorker({
      processorError: new Error('stats unavailable'),
      event: {
        id: '51',
        eventType: 'COURSE_CONFIRMED',
        payload: {},
        attemptCount: 2,
      },
    })

    await expect(worker.runOnce()).resolves.toBe(true)

    expect(queryRunner.query.mock.calls[3][0]).toContain('"status" = $2')
    expect(queryRunner.query.mock.calls[3][1]).toEqual([
      '51',
      'FAILED',
      5_000,
      'stats unavailable',
    ])
  })

  it('최대 시도 횟수에 도달하면 DEAD_LETTER로 전환한다', async () => {
    const { worker, queryRunner } = createWorker({
      processorError: new Error('invalid payload'),
      event: {
        id: '52',
        eventType: 'COURSE_CONFIRMED',
        payload: {},
        attemptCount: 5,
      },
    })

    await expect(worker.runOnce()).resolves.toBe(true)
    expect(queryRunner.query.mock.calls[3][1]).toEqual([
      '52',
      'DEAD_LETTER',
      0,
      'invalid payload',
    ])
  })

  it('재구성 exclusive lock이 잡혀 있으면 이벤트를 선점하지 않는다', async () => {
    const { worker, processor, queryRunner } = createWorker({
      lockAcquired: false,
    })

    await expect(worker.runOnce()).resolves.toBe(false)
    expect(processor.process).not.toHaveBeenCalled()
    expect(queryRunner.query).toHaveBeenCalledTimes(1)
    expect(queryRunner.release).toHaveBeenCalled()
  })
})
