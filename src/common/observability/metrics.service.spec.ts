import type { ConfigService } from '@nestjs/config'
import { MetricsService } from './metrics.service'

function createMetricsService(enabled = true): MetricsService {
  const values = new Map<string, unknown>([
    ['METRICS_ENABLED', enabled],
    ['METRICS_PORT', 9464],
    ['SERVICE_NAME', 'momo-test'],
  ])
  const config = {
    get: <T>(key: string): T | undefined => values.get(key) as T | undefined,
  } as unknown as ConfigService

  return new MetricsService(config)
}

describe('MetricsService', () => {
  it('HTTP 요청을 저카디널리티 라벨로 기록한다', async () => {
    const metrics = createMetricsService()
    metrics.recordHttpRequest({
      method: 'GET',
      route: '/api/v1/meetings/:meetingId',
      statusCode: 200,
      durationSeconds: 0.125,
    })

    const output = await metrics.metrics()

    expect(output).toContain('momo_http_server_requests_total')
    expect(output).toContain('method="GET"')
    expect(output).toContain('route="/api/v1/meetings/:meetingId"')
    expect(output).toContain('status_code="200"')
    expect(output).toContain('service="momo-test"')
  })

  it('외부 연동 실패를 기록하고 원래 오류를 다시 던진다', async () => {
    const metrics = createMetricsService()
    const error = new Error('upstream unavailable')

    await expect(
      metrics.observeExternal('openai', 'questionnaire_generation', () =>
        Promise.reject(error),
      ),
    ).rejects.toBe(error)

    const output = await metrics.metrics()
    expect(output).toContain('momo_external_requests_total')
    expect(output).toContain('dependency="openai"')
    expect(output).toContain('operation="questionnaire_generation"')
    expect(output).toContain('outcome="failure"')
  })

  it('워커 성공 시 처리 건수와 마지막 성공 시각을 기록한다', async () => {
    const metrics = createMetricsService()

    await expect(
      metrics.observeWorkerJob(
        'statistics_outbox',
        'process_event',
        async () => 1,
      ),
    ).resolves.toBe(1)

    const output = await metrics.metrics()
    expect(output).toContain('momo_worker_jobs_total')
    expect(output).toContain('worker="statistics_outbox"')
    expect(output).toContain('outcome="success"')
    expect(output).toContain('momo_worker_last_success_unixtime_seconds')
  })
})
