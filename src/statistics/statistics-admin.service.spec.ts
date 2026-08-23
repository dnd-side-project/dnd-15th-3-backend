import { StatisticsAdminService } from './statistics-admin.service'

describe('StatisticsAdminService', () => {
  it('지정한 DEAD_LETTER 이벤트의 시도 횟수를 초기화해 재처리한다', async () => {
    const coreDataSource = {
      query: jest.fn().mockResolvedValue([{ id: '10' }]),
    }
    const service = new StatisticsAdminService(
      coreDataSource as never,
      { rebuild: jest.fn() } as never,
    )

    await expect(service.retryDeadLetters(['10'])).resolves.toEqual(['10'])
    expect(coreDataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('"attempt_count" = 0'),
      ['COURSE_CONFIRMED', ['10']],
    )
  })

  it('명시적인 null 대상은 모든 DEAD_LETTER를 의미한다', async () => {
    const coreDataSource = { query: jest.fn().mockResolvedValue([]) }
    const service = new StatisticsAdminService(
      coreDataSource as never,
      { rebuild: jest.fn() } as never,
    )

    await service.retryDeadLetters(null)
    expect(coreDataSource.query.mock.calls[0][0]).not.toContain('ANY(')
  })

  it('잘못된 event id는 쿼리 전에 거부한다', async () => {
    const coreDataSource = { query: jest.fn() }
    const service = new StatisticsAdminService(
      coreDataSource as never,
      { rebuild: jest.fn() } as never,
    )

    await expect(service.retryDeadLetters(['0'])).rejects.toThrow(
      '1 이상의 정수',
    )
    expect(coreDataSource.query).not.toHaveBeenCalled()
  })
})
