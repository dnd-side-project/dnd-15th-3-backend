import { CommonException } from './common.exception'
import { CommonErrorCode } from './common-error-code'

interface ValidationIssue {
  path: readonly PropertyKey[]
  message: string
}

export function createValidationException(
  issues: readonly ValidationIssue[],
): CommonException {
  return new CommonException(
    CommonErrorCode.validationError,
    issues.map((issue) => ({
      field: issue.path.map(String).join('.') || 'request',
      reason: issue.message,
    })),
  )
}
