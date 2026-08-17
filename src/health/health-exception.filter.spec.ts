import {
  ArgumentsHost,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common'
import { HealthExceptionFilter } from './health-exception.filter'

describe('HealthExceptionFilter', () => {
  it('Terminus 상태 점검 응답 형식을 그대로 유지한다', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost
    const healthResponse = {
      status: 'error',
      info: {},
      error: { storage: { status: 'down' } },
      details: { storage: { status: 'down' } },
    }

    new HealthExceptionFilter().catch(
      new ServiceUnavailableException(healthResponse),
      host,
    )

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE)
    expect(response.json).toHaveBeenCalledWith(healthResponse)
  })
})
