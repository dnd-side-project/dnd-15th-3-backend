import { CourseGenerationWorker } from './course-generation.worker'

describe('CourseGenerationWorker', () => {
  it('pending run을 선점해 프로세서에 위임한다', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[{ id: '70' }], 1]),
    }
    const processor = { processRun: jest.fn().mockResolvedValue(undefined) }
    const worker = new CourseGenerationWorker(
      dataSource as never,
      processor as never,
    )

    await expect(worker.runOnce()).resolves.toBe(true)
    expect(processor.processRun).toHaveBeenCalledWith('70')
    expect(dataSource.query).toHaveBeenCalledTimes(2)
  })

  it('처리할 run이 없으면 false를 반환한다', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([[], 0]),
    }
    const processor = { processRun: jest.fn() }
    const worker = new CourseGenerationWorker(
      dataSource as never,
      processor as never,
    )

    await expect(worker.runOnce()).resolves.toBe(false)
    expect(processor.processRun).not.toHaveBeenCalled()
  })
})
