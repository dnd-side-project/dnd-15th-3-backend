import { HttpStatus } from '@nestjs/common'
import type { ErrorCode } from 'src/common/exception/error-code.type'

export const PlaceErrorCode = {
  meetingLocationNotFound: {
    code: 'PLACE_MEETING_LOCATION_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '해당 모임의 첫 만남 기준 위치를 찾을 수 없습니다.',
  },
  invalidSearchResponse: {
    code: 'PLACE_INVALID_SEARCH_RESPONSE',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '장소 검색 결과를 처리하지 못했습니다.',
  },
  providerUnavailable: {
    code: 'PLACE_PROVIDER_UNAVAILABLE',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: '장소 검색 서비스를 일시적으로 사용할 수 없습니다.',
  },
  providerRequestFailed: {
    code: 'PLACE_PROVIDER_REQUEST_FAILED',
    status: HttpStatus.BAD_GATEWAY,
    message: '장소 검색 서비스 연동에 실패했습니다.',
  },
  invalidProviderResponse: {
    code: 'PLACE_INVALID_PROVIDER_RESPONSE',
    status: HttpStatus.BAD_GATEWAY,
    message: '장소 검색 서비스 응답을 처리하지 못했습니다.',
  },
} as const satisfies Record<string, ErrorCode>
