import { NestFactory } from '@nestjs/core'
import { AppModule } from 'src/app.module'
import { MediaCleanupWorker } from 'src/media/media-cleanup.worker'
import { PlaceSyncWorker } from './sync/place-sync.worker'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const placeSyncWorker = app.get(PlaceSyncWorker)
  const mediaCleanupWorker = app.get(MediaCleanupWorker)

  const shutdown = async () => {
    placeSyncWorker.stop()
    mediaCleanupWorker.stop()
    await app.close()
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  await Promise.all([placeSyncWorker.run(), mediaCleanupWorker.run()])
}

void bootstrap()
