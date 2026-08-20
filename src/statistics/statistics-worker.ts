import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { StatisticsWorkerModule } from './statistics-worker.module'

const logger = new Logger('StatisticsWorker')

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(StatisticsWorkerModule)
  logger.log('Statistics worker connected and running')

  await new Promise<void>((resolve) => {
    const shutdown = async () => {
      logger.log('Statistics worker shutting down')
      await app.close()
      resolve()
    }

    process.once('SIGTERM', shutdown)
    process.once('SIGINT', shutdown)
  })
}

void bootstrap()
