import type { ConsoleLoggerOptions } from '@nestjs/common'
import { ApplicationLogger } from './application-logger'
import { runWithObservabilityContext } from './observability-context'

class TestApplicationLogger extends ApplicationLogger {
  constructor() {
    const options: ConsoleLoggerOptions = {
      colors: false,
      compact: true,
      json: true,
    }
    super('momo-api', options)
  }

  render(message: unknown) {
    return this.getJsonLogObject(message, {
      context: 'TestContext',
      logLevel: 'log',
    })
  }
}

describe('ApplicationLogger', () => {
  it('구조화 필드와 요청 ID를 JSON 로그 최상위에 추가한다', () => {
    const logger = new TestApplicationLogger()

    const result = runWithObservabilityContext(
      { requestId: 'request-123' },
      () =>
        logger.render({
          event: 'http_request_completed',
          route: '/api/v1/meetings/:meetingId',
        }),
    )

    expect(result).toMatchObject({
      context: 'TestContext',
      event: 'http_request_completed',
      level: 'log',
      message: 'http_request_completed',
      // biome-ignore lint/style/useNamingConvention: Structured log schema uses snake_case.
      request_id: 'request-123',
      route: '/api/v1/meetings/:meetingId',
      service: 'momo-api',
    })
  })

  it('문자열 로그에도 서비스 이름을 추가한다', () => {
    const logger = new TestApplicationLogger()

    expect(logger.render('started')).toMatchObject({
      message: 'started',
      service: 'momo-api',
    })
  })
})
