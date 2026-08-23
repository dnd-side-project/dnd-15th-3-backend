import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { StatisticsAdminService } from './statistics-admin.service'
import { StatisticsWorkerModule } from './statistics-worker.module'

const logger = new Logger('StatisticsAdmin')

function parseRetryTargets(args: string[]): string[] | null {
  if (args.length === 1 && args[0] === '--all') return null

  const eventIds: string[] = []
  for (let index = 0; index < args.length; index += 2) {
    if (args[index] !== '--event-id' || !args[index + 1]) {
      throw new Error(
        'retry-dead-letter에는 --all 또는 --event-id <id>를 지정해야 합니다.',
      )
    }
    eventIds.push(args[index + 1])
  }
  if (eventIds.length === 0) {
    throw new Error(
      'retry-dead-letter에는 --all 또는 --event-id <id>를 지정해야 합니다.',
    )
  }
  return eventIds
}

async function bootstrap(): Promise<void> {
  const [command, ...args] = process.argv.slice(2)
  const app = await NestFactory.createApplicationContext(StatisticsWorkerModule)

  try {
    const admin = app.get(StatisticsAdminService)
    if (command === 'rebuild') {
      const result = await admin.rebuild()
      logger.log(`통계 재구성이 완료되었습니다. ${JSON.stringify(result)}`)
      return
    }
    if (command === 'retry-dead-letter') {
      const retriedIds = await admin.retryDeadLetters(parseRetryTargets(args))
      logger.log(
        `DEAD_LETTER ${retriedIds.length}건을 PENDING으로 전환했습니다. ids=${retriedIds.join(',')}`,
      )
      return
    }
    throw new Error(
      '사용법: statistics-admin <rebuild|retry-dead-letter> [--all|--event-id <id>] ',
    )
  } finally {
    await app.close()
  }
}

void bootstrap().catch((error) => {
  logger.error(
    '통계 관리자 명령이 실패했습니다.',
    error instanceof Error ? error.stack : String(error),
  )
  process.exitCode = 1
})
