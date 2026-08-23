import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { StatisticsOutboxWorker } from './statistics-outbox.worker'
import { StatisticsWorkerModule } from './statistics-worker.module'

const logger = new Logger('StatisticsWorker')

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(StatisticsWorkerModule)
  const worker = app.get(StatisticsOutboxWorker)
  logger.log('Statistics worker connected and running')

  const shutdown = () => {
    logger.log('Statistics worker shutting down')
    worker.stop()
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  try {
    await worker.run()
  } finally {
    await app.close()
  }
}

void bootstrap()
