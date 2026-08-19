import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common'
import type { Response } from 'express'

// Kubernetes probe가 소비하는 Terminus 응답은 공통 API 에러 envelope 대신 원래 형식을 유지한다.
@Catch(HttpException)
export class HealthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(exception.getStatus())
      .json(exception.getResponse())
  }
}
