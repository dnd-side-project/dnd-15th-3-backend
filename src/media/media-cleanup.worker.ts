import { Injectable, Logger, Optional } from '@nestjs/common'
import { MetricsService } from 'src/common/observability/metrics.service'
import { MediaService } from './media.service'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

@Injectable()
export class MediaCleanupWorker {
  private readonly logger = new Logger(MediaCleanupWorker.name)
  private isRunning = true
  private releaseDelay?: () => void

  constructor(
    private readonly mediaService: MediaService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  runOnce(): Promise<number> {
    const cleanup = () => this.mediaService.reconcileOrphanedMedia()
    if (!this.metrics) return cleanup()

    return this.metrics.observeWorkerJob(
      'media_cleanup',
      'reconcile_orphaned_media',
      cleanup,
    )
  }

  async run(): Promise<void> {
    this.metrics?.setWorkerRunning('media_cleanup', true)
    this.logger.log('Media cleanup worker started')
    while (this.isRunning) {
      try {
        const cleanedCount = await this.runOnce()
        if (cleanedCount > 0) {
          this.logger.log(`Cleaned ${cleanedCount} orphaned media object(s)`)
        }
      } catch (error) {
        this.logger.error(
          'Media cleanup worker loop failed',
          error instanceof Error ? error.stack : String(error),
        )
      }

      if (this.isRunning) await this.delay(CLEANUP_INTERVAL_MS)
    }
  }

  stop(): void {
    this.isRunning = false
    this.metrics?.setWorkerRunning('media_cleanup', false)
    this.releaseDelay?.()
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.releaseDelay = undefined
        resolve()
      }, milliseconds)
      this.releaseDelay = () => {
        clearTimeout(timeout)
        this.releaseDelay = undefined
        resolve()
      }
    })
  }
}
