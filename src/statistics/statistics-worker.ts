import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { createApplicationLogger } from 'src/common/observability/application-logger'
import type { StatisticsWorkerEnv } from './config/statistics-worker.env'
import { StatisticsOutboxWorker } from './statistics-outbox.worker'
import { StatisticsWorkerModule } from './statistics-worker.module'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    StatisticsWorkerModule,
    { bufferLogs: true },
  )
  const config = app.get(ConfigService) as ConfigService<
    StatisticsWorkerEnv,
    true
  >
  app.useLogger(
    createApplicationLogger({
      serviceName: config.get('SERVICE_NAME', { infer: true }),
      format: config.get('LOG_FORMAT', { infer: true }),
      level: config.get('LOG_LEVEL', { infer: true }),
    }),
  )
  const worker = app.get(StatisticsOutboxWorker)
  const logger = new Logger('StatisticsWorker')
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
