import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common'
import { CommonException } from '../exception/common.exception'
import { CommonErrorCode } from '../exception/common-error-code'
import {
  BIGINT_STRING_PATTERN,
  INVALID_FORMAT_REASON,
} from './bigint-string.pipe'

// excludeIds 같은 콤마 구분 ID 목록 쿼리 파라미터를 검증한다. 값이 없으면 undefined를 그대로 반환
@Injectable()
export class BigIntStringArrayPipe
  implements PipeTransform<string | undefined, string[] | undefined>
{
  transform(
    value: string | undefined,
    metadata: ArgumentMetadata,
  ): string[] | undefined {
    if (value === undefined) {
      return undefined
    }

    const items = value.split(',')
    const hasInvalidItem = items.some(
      (item) => !BIGINT_STRING_PATTERN.test(item),
    )
    if (hasInvalidItem) {
      throw new CommonException(CommonErrorCode.validationError, [
        { field: metadata.data ?? 'request', reason: INVALID_FORMAT_REASON },
      ])
    }

    return items
  }
}
