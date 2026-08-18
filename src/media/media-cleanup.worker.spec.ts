import { MediaCleanupWorker } from './media-cleanup.worker'

describe('MediaCleanupWorker', () => {
  it('reconciles orphaned media once', async () => {
    const mediaService = {
      reconcileOrphanedMedia: jest.fn().mockResolvedValue(2),
    }
    const worker = new MediaCleanupWorker(mediaService as never)

    await expect(worker.runOnce()).resolves.toBe(2)
    expect(mediaService.reconcileOrphanedMedia).toHaveBeenCalledTimes(1)
  })
})
