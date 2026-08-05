import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common'

const BIGINT_STRING_PATTERN = /^\d+$/
const INVALID_FORMAT_REASON = '숫자 형식이어야 합니다.'

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
