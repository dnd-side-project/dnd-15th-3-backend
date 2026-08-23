import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { MetricsService } from './metrics.service'

@Injectable()
export class MetricsServerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MetricsServerService.name)
  private server: Server | undefined

  constructor(private readonly metrics: MetricsService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.metrics.isEnabled()) return

    const server = createServer(this.handleRequest)
    this.server = server

    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error) => reject(error)
      server.once('error', handleError)
      server.listen(this.metrics.port(), '0.0.0.0', () => {
        server.off('error', handleError)
        resolve()
      })
    })

    this.logger.log({
      event: 'metrics_server_started',
      port: this.metrics.port(),
    })
  }

  async onApplicationShutdown(): Promise<void> {
    const server = this.server
    if (!server?.listening) return

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  private readonly handleRequest = (
    request: IncomingMessage,
    response: ServerResponse,
  ): void => {
    const path = request.url?.split('?', 1)[0]

    if (request.method === 'GET' && path === '/metrics') {
      void this.writeMetrics(response)
      return
    }

    if (request.method === 'GET' && path === '/health/live') {
      this.writeResponse(response, 200, 'text/plain; charset=utf-8', 'ok\n')
      return
    }

    this.writeResponse(
      response,
      404,
      'text/plain; charset=utf-8',
      'not found\n',
    )
  }

  private async writeMetrics(response: ServerResponse): Promise<void> {
    try {
      const body = await this.metrics.metrics()
      this.writeResponse(response, 200, this.metrics.contentType(), body)
    } catch (error) {
      this.logger.error({
        event: 'metrics_render_failed',
        // biome-ignore lint/style/useNamingConvention: Structured log schema uses snake_case.
        error_type: error instanceof Error ? error.name : typeof error,
      })
      this.writeResponse(
        response,
        500,
        'text/plain; charset=utf-8',
        'metrics unavailable\n',
      )
    }
  }

  private writeResponse(
    response: ServerResponse,
    statusCode: number,
    contentType: string,
    body: string,
  ): void {
    response.writeHead(statusCode, {
      'Cache-Control': 'no-store',
      'Content-Type': contentType,
    })
    response.end(body)
  }
}
