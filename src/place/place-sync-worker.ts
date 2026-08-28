import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from 'src/app.module'
import { createApplicationLogger } from 'src/common/observability/application-logger'
import type { Env } from 'src/config/env'
import { MediaCleanupWorker } from 'src/media/media-cleanup.worker'
import { QuestionnaireGenerationWorker } from 'src/questionnaire/questionnaire-generation.worker'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  })
  const config = app.get(ConfigService) as ConfigService<Env, true>
  app.useLogger(
    createApplicationLogger({
      serviceName: config.get('SERVICE_NAME', { infer: true }),
      format: config.get('LOG_FORMAT', { infer: true }),
      level: config.get('LOG_LEVEL', { infer: true }),
    }),
  )
  const mediaCleanupWorker = app.get(MediaCleanupWorker)
  const questionnaireGenerationWorker = app.get(QuestionnaireGenerationWorker)

  const shutdown = async () => {
    mediaCleanupWorker.stop()
    questionnaireGenerationWorker.stop()
    await app.close()
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  await Promise.all([
    mediaCleanupWorker.run(),
    questionnaireGenerationWorker.run(),
  ])
}

void bootstrap()
