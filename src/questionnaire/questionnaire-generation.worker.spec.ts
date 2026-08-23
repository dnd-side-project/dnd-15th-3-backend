import { QuestionnaireGenerationWorker } from './questionnaire-generation.worker'

describe('QuestionnaireGenerationWorker', () => {
  it('생성 대기 중인 질문지를 선점해 프로세서에 위임한다', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValue([[{ id: '60', generationAttemptCount: 2 }], 1]),
    }
    const processor = {
      processQuestionnaire: jest.fn().mockResolvedValue(undefined),
    }
    const worker = new QuestionnaireGenerationWorker(
      dataSource as never,
      processor as never,
    )

    await expect(worker.runOnce()).resolves.toBe(true)
    expect(processor.processQuestionnaire).toHaveBeenCalledWith('60', 2)
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE SKIP LOCKED'),
      [60_000],
    )
  })

  it('처리할 질문지가 없으면 false를 반환한다', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([[], 0]) }
    const processor = { processQuestionnaire: jest.fn() }
    const worker = new QuestionnaireGenerationWorker(
      dataSource as never,
      processor as never,
    )

    await expect(worker.runOnce()).resolves.toBe(false)
    expect(processor.processQuestionnaire).not.toHaveBeenCalled()
  })
})
