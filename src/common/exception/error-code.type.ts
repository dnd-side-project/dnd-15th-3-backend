import { HttpStatus } from '@nestjs/common'

// 도메인별 에러 코드가 공통으로 구현하는 필드
export interface ErrorCode {
  code: string
  status: HttpStatus
  message: string
}
