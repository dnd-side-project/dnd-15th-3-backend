import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  NotImplementedException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { MeetingException } from 'src/meeting/exception/meeting.exception'
import { MeetingErrorCode } from 'src/meeting/exception/meeting-error-code'
import { CommonException } from './common.exception'
import { CommonErrorCode } from './common-error-code'
import { GlobalExceptionFilter } from './global-exception.filter'

function createHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost

  return { host, response }
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter()

  it('도메인 예외를 ErrorCode 응답 계약으로 변환한다', () => {
    const { host, response } = createHost()

    filter.catch(new MeetingException(MeetingErrorCode.notFound), host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
    expect(response.json).toHaveBeenCalledWith({
      code: MeetingErrorCode.notFound.code,
      message: MeetingErrorCode.notFound.message,
    })
  })

  it('검증 예외의 필드별 상세 정보를 응답에 포함한다', () => {
    const { host, response } = createHost()
    const fieldErrors = [
      { field: 'host.nickname', reason: '닉네임을 입력해주세요.' },
    ]

    filter.catch(
      new CommonException(CommonErrorCode.validationError, fieldErrors),
      host,
    )

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(response.json).toHaveBeenCalledWith({
      code: CommonErrorCode.validationError.code,
      message: CommonErrorCode.validationError.message,
      fieldErrors,
    })
  })

  it('남아 있는 Nest HTTP 예외도 공통 응답 계약으로 변환한다', () => {
    const { host, response } = createHost()

    filter.catch(new NotImplementedException('내부 구현 정보'), host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_IMPLEMENTED)
    expect(response.json).toHaveBeenCalledWith({
      code: CommonErrorCode.notImplemented.code,
      message: CommonErrorCode.notImplemented.message,
    })
  })

  it('별도 매핑이 없는 HTTP 예외의 원래 상태를 보존한다', () => {
    const { host, response } = createHost()

    filter.catch(new UnprocessableEntityException('내부 구현 정보'), host)

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    )
    expect(response.json).toHaveBeenCalledWith({
      code: CommonErrorCode.requestFailed.code,
      message: CommonErrorCode.requestFailed.message,
    })
  })

  it('예상하지 못한 오류의 내부 메시지를 노출하지 않는다', () => {
    const { host, response } = createHost()
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation()

    filter.catch(new Error('database password leaked'), host)

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
    expect(response.json).toHaveBeenCalledWith({
      code: CommonErrorCode.internalServerError.code,
      message: CommonErrorCode.internalServerError.message,
    })
    expect(logger).toHaveBeenCalled()
    logger.mockRestore()
  })
})
