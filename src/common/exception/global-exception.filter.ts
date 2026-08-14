import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Response } from 'express'
import { BaseException } from './base.exception'
import { CommonException } from './common.exception'
import { CommonErrorCode } from './common-error-code'
import type { ErrorCode } from './error-code.type'
import type { ErrorResponseDto } from './error-response.dto'

const httpErrorCodeByStatus: Partial<Record<HttpStatus, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: CommonErrorCode.validationError,
  [HttpStatus.UNAUTHORIZED]: CommonErrorCode.authenticationFailed,
  [HttpStatus.FORBIDDEN]: CommonErrorCode.accessDenied,
  [HttpStatus.NOT_FOUND]: CommonErrorCode.resourceNotFound,
  [HttpStatus.CONFLICT]: CommonErrorCode.conflict,
  [HttpStatus.NOT_IMPLEMENTED]: CommonErrorCode.notImplemented,
  [HttpStatus.BAD_GATEWAY]: CommonErrorCode.externalServiceError,
  [HttpStatus.SERVICE_UNAVAILABLE]: CommonErrorCode.serviceUnavailable,
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const { errorCode, fieldErrors } = this.resolveException(exception)
    const body: ErrorResponseDto = {
      code: errorCode.code,
      message: errorCode.message,
      ...(fieldErrors ? { fieldErrors } : {}),
    }

    response.status(errorCode.status).json(body)
  }

  private resolveException(exception: unknown): {
    errorCode: ErrorCode
    fieldErrors?: CommonException['fieldErrors']
  } {
    if (exception instanceof BaseException) {
      return {
        errorCode: exception.errorCode,
        fieldErrors:
          exception instanceof CommonException
            ? exception.fieldErrors
            : undefined,
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const fallbackErrorCode =
        status >= HttpStatus.BAD_REQUEST &&
        status < HttpStatus.INTERNAL_SERVER_ERROR
          ? CommonErrorCode.requestFailed
          : CommonErrorCode.internalServerError

      return {
        errorCode: httpErrorCodeByStatus[status] ?? {
          ...fallbackErrorCode,
          status,
        },
        fieldErrors: this.extractFieldErrors(exception),
      }
    }

    this.logger.error('Unhandled exception', exception)
    return { errorCode: CommonErrorCode.internalServerError }
  }

  private extractFieldErrors(
    exception: HttpException,
  ): CommonException['fieldErrors'] {
    const response = exception.getResponse()
    if (typeof response !== 'object' || response === null) return undefined
    if (!('fieldErrors' in response) || !Array.isArray(response.fieldErrors)) {
      return undefined
    }

    return response.fieldErrors.filter(
      (item): item is { field: string; reason: string } =>
        typeof item === 'object' &&
        item !== null &&
        'field' in item &&
        typeof item.field === 'string' &&
        'reason' in item &&
        typeof item.reason === 'string',
    )
  }
}
