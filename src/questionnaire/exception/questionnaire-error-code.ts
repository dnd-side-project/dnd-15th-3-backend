import { HttpStatus } from '@nestjs/common'
import type { ErrorCode } from 'src/common/exception/error-code.type'

export const QuestionnaireErrorCode = {
  notFound: {
    code: 'QUESTIONNAIRE_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '모임 질문을 찾을 수 없습니다.',
  },
  notReady: {
    code: 'QUESTIONNAIRE_NOT_READY',
    status: HttpStatus.CONFLICT,
    message: '모임 질문이 아직 준비되지 않았습니다.',
  },
  generationNotAllowed: {
    code: 'QUESTIONNAIRE_GENERATION_NOT_ALLOWED',
    status: HttpStatus.CONFLICT,
    message: '현재 모임 상태에서는 질문을 생성할 수 없습니다.',
  },
  generationFailed: {
    code: 'QUESTIONNAIRE_GENERATION_FAILED',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: '모임 질문을 생성하지 못했습니다.',
  },
  stale: {
    code: 'QUESTIONNAIRE_STALE',
    status: HttpStatus.CONFLICT,
    message: '오래된 모임 질문입니다. 최신 질문을 다시 조회해주세요.',
  },
  invalidAnswers: {
    code: 'QUESTIONNAIRE_INVALID_ANSWERS',
    status: HttpStatus.BAD_REQUEST,
    message: '모임 질문의 답변이 올바르지 않습니다.',
  },
} as const satisfies Record<string, ErrorCode>
