import { randomUUID } from 'node:crypto'
import { Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { MetricsService } from './metrics.service'
import { runWithObservabilityContext } from './observability-context'

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const ignoredPaths = new Set(['/health', '/health/live', '/health/storage'])

function resolveRequestId(value: string | undefined): string {
  return value && requestIdPattern.test(value) ? value : randomUUID()
}

function resolveRoute(request: Request): string {
  const routePath = request.route?.path
  if (typeof routePath !== 'string') return 'unmatched'

  return `${request.baseUrl}${routePath}` || '/'
}

export function createRequestObservabilityMiddleware(metrics: MetricsService) {
  const logger = new Logger('HttpRequest')

  return (request: Request, response: Response, next: NextFunction): void => {
    const requestId = resolveRequestId(request.get('x-request-id'))
    const startedAt = process.hrtime.bigint()
    response.setHeader('x-request-id', requestId)

    runWithObservabilityContext({ requestId }, () => {
      response.once('finish', () => {
        if (ignoredPaths.has(request.path)) return

        const durationSeconds =
          Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
        const event = {
          event: 'http_request_completed',
          method: request.method,
          route: resolveRoute(request),
          // biome-ignore lint/style/useNamingConvention: Structured log schema uses snake_case.
          status_code: response.statusCode,
          // biome-ignore lint/style/useNamingConvention: Structured log schema uses snake_case.
          duration_ms: Math.round(durationSeconds * 1000),
        }

        metrics.recordHttpRequest({
          method: request.method,
          route: event.route,
          statusCode: response.statusCode,
          durationSeconds,
        })

        if (response.statusCode >= 500) logger.error(event)
        else if (response.statusCode >= 400) logger.warn(event)
        else logger.log(event)
      })

      next()
    })
  }
}
