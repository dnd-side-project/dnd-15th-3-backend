import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  Counter,
  collectDefaultMetrics,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client'

type MetricOutcome = 'success' | 'failure'

@Injectable()
export class MetricsService {
  private readonly registry = new Registry()
  private readonly enabled: boolean
  private readonly metricsPort: number

  private readonly httpRequests = new Counter({
    name: 'momo_http_server_requests_total',
    help: 'Number of completed Momo HTTP requests.',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  })

  private readonly httpRequestDuration = new Histogram({
    name: 'momo_http_server_request_duration_seconds',
    help: 'Duration of completed Momo HTTP requests in seconds.',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  })

  private readonly externalRequests = new Counter({
    name: 'momo_external_requests_total',
    help: 'Number of completed outbound dependency operations.',
    labelNames: ['dependency', 'operation', 'outcome'] as const,
    registers: [this.registry],
  })

  private readonly externalRequestDuration = new Histogram({
    name: 'momo_external_request_duration_seconds',
    help: 'Duration of outbound dependency operations in seconds.',
    labelNames: ['dependency', 'operation', 'outcome'] as const,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    registers: [this.registry],
  })

  private readonly workerJobs = new Counter({
    name: 'momo_worker_jobs_total',
    help: 'Number of completed background worker jobs.',
    labelNames: ['worker', 'operation', 'outcome'] as const,
    registers: [this.registry],
  })

  private readonly workerJobDuration = new Histogram({
    name: 'momo_worker_job_duration_seconds',
    help: 'Duration of background worker jobs in seconds.',
    labelNames: ['worker', 'operation', 'outcome'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 300],
    registers: [this.registry],
  })

  private readonly workerLastSuccess = new Gauge({
    name: 'momo_worker_last_success_unixtime_seconds',
    help: 'Unix timestamp of the last successful background worker job.',
    labelNames: ['worker', 'operation'] as const,
    registers: [this.registry],
  })

  private readonly workerRunning = new Gauge({
    name: 'momo_worker_running',
    help: 'Whether a background worker loop is running.',
    labelNames: ['worker'] as const,
    registers: [this.registry],
  })

  constructor(config: ConfigService) {
    this.enabled = config.get<boolean>('METRICS_ENABLED') ?? false
    this.metricsPort = config.get<number>('METRICS_PORT') ?? 9464

    this.registry.setDefaultLabels({
      service: config.get<string>('SERVICE_NAME') ?? 'momo',
    })

    if (this.enabled) {
      collectDefaultMetrics({
        prefix: 'momo_',
        register: this.registry,
      })
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  port(): number {
    return this.metricsPort
  }

  contentType(): string {
    return this.registry.contentType
  }

  metrics(): Promise<string> {
    return this.registry.metrics()
  }

  recordHttpRequest(input: {
    method: string
    route: string
    statusCode: number
    durationSeconds: number
  }): void {
    if (!this.enabled) return

    const labels = {
      method: input.method,
      route: input.route,
      // biome-ignore lint/style/useNamingConvention: Prometheus label schema uses snake_case.
      status_code: String(input.statusCode),
    }
    this.httpRequests.inc(labels)
    this.httpRequestDuration.observe(labels, input.durationSeconds)
  }

  async observeExternal<T>(
    dependency: string,
    operation: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) return callback()

    const startedAt = process.hrtime.bigint()
    let outcome: MetricOutcome = 'success'

    try {
      return await callback()
    } catch (error) {
      outcome = 'failure'
      throw error
    } finally {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
      const labels = { dependency, operation, outcome }
      this.externalRequests.inc(labels)
      this.externalRequestDuration.observe(labels, durationSeconds)
    }
  }

  async observeWorkerJob<T>(
    worker: string,
    operation: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) return callback()

    const startedAt = process.hrtime.bigint()
    let outcome: MetricOutcome = 'success'

    try {
      const result = await callback()
      this.workerLastSuccess.set(
        { worker, operation },
        Math.floor(Date.now() / 1000),
      )
      return result
    } catch (error) {
      outcome = 'failure'
      throw error
    } finally {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
      const labels = { worker, operation, outcome }
      this.workerJobs.inc(labels)
      this.workerJobDuration.observe(labels, durationSeconds)
    }
  }

  setWorkerRunning(worker: string, running: boolean): void {
    if (!this.enabled) return
    this.workerRunning.set({ worker }, running ? 1 : 0)
  }
}
