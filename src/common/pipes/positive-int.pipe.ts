import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common'
import { CommonException } from '../exception/common.exception'
import { CommonErrorCode } from '../exception/common-error-code'
import { BIGINT_STRING_PATTERN } from './bigint-string.pipe'

export const NOT_POSITIVE_INTEGER_REASON = '1 이상의 정수여야 합니다.'

// 쿼리 파라미터는 항상 문자열로 들어오므로, 1 이상의 정수 문자열만 허용하고 값이 없으면 기본값을 반환
@Injectable()
export class PositiveIntPipe
  implements PipeTransform<string | undefined, number>
{
  constructor(private readonly defaultValue?: number) {}

  transform(value: string | undefined, metadata: ArgumentMetadata): number {
    if (value === undefined) {
      if (this.defaultValue !== undefined) {
        return this.defaultValue
      }
      throw new CommonException(CommonErrorCode.validationError, [
        {
          field: metadata.data ?? 'request',
          reason: NOT_POSITIVE_INTEGER_REASON,
        },
      ])
    }

    if (!BIGINT_STRING_PATTERN.test(value) || Number(value) < 1) {
      throw new CommonException(CommonErrorCode.validationError, [
        {
          field: metadata.data ?? 'request',
          reason: NOT_POSITIVE_INTEGER_REASON,
        },
      ])
    }

    return Number(value)
  }
}
