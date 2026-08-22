import { NestFactory } from '@nestjs/core'
import { AppModule } from 'src/app.module'
import { CourseGenerationWorker } from 'src/course/course-generation.worker'
import { MediaCleanupWorker } from 'src/media/media-cleanup.worker'
import { QuestionnaireGenerationWorker } from 'src/questionnaire/questionnaire-generation.worker'
import { PlaceSyncWorker } from './sync/place-sync.worker'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const placeSyncWorker = app.get(PlaceSyncWorker)
  const courseGenerationWorker = app.get(CourseGenerationWorker)
  const mediaCleanupWorker = app.get(MediaCleanupWorker)
  const questionnaireGenerationWorker = app.get(QuestionnaireGenerationWorker)

  const shutdown = async () => {
    placeSyncWorker.stop()
    courseGenerationWorker.stop()
    mediaCleanupWorker.stop()
    questionnaireGenerationWorker.stop()
    await app.close()
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  await Promise.all([
    placeSyncWorker.run(),
    mediaCleanupWorker.run(),
    courseGenerationWorker.run(),
    questionnaireGenerationWorker.run(),
  ])
}

void bootstrap()
