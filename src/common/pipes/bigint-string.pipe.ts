import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common'

export const BIGINT_STRING_PATTERN = /^[1-9]\d*$/
export const INVALID_FORMAT_REASON =
  '1 이상의 숫자여야 하며 앞자리에 0이 올 수 없습니다.'

// bigint 컬럼 값은 JS number 정밀도 문제로 string으로 다루므로, 숫자 문자열 형식만 검증하고 타입은 바꾸지 않음
@Injectable()
export class BigIntStringPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!BIGINT_STRING_PATTERN.test(value)) {
      throw new BadRequestException({
        fieldErrors: [{ field: metadata.data, reason: INVALID_FORMAT_REASON }],
      })
    }
    return value
  }
}
