import { NestFactory } from '@nestjs/core'
import { AppModule } from 'src/app.module'
import { PlaceSyncWorker } from './sync/place-sync.worker'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const worker = app.get(PlaceSyncWorker)

  const shutdown = async () => {
    worker.stop()
    await app.close()
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  await worker.run()
}

void bootstrap()
