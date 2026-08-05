import { HttpStatus } from '@nestjs/common'
import { ErrorCode } from 'src/common/exception/error-code.type'

// meeting 도메인 전용 에러 코드. 도메인에 속하지 않는 에러는 CommonErrorCode에 정의
export const MeetingErrorCode = {
  notFound: {
    code: 'MEETING_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '해당 모임을 찾을 수 없습니다.',
  },
  notParticipant: {
    code: 'MEETING_ACCESS_DENIED',
    status: HttpStatus.FORBIDDEN,
    message: '해당 모임에 접근할 권한이 없습니다.',
  },
} as const satisfies Record<string, ErrorCode>
