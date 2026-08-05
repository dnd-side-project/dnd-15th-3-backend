import { HttpStatus } from '@nestjs/common'

// 도메인별 에러 코드가 공통으로 구현하는 필드
export interface ErrorCode {
  code: string
  status: HttpStatus
  message: string
}

//검증 실패 . 어떤 필드가 왜 잘못됐는지 나타내는 값
export interface ValidationErrorDetail {
  field: string
  reason: string
}
