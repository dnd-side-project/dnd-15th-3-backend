import { BadRequestException, type PipeTransform } from '@nestjs/common'
import { z } from 'zod'

function createValidationException(error: z.ZodError): BadRequestException {
  return new BadRequestException({
    message: '요청 입력값이 올바르지 않습니다.',
    errors: error.issues.map((issue) => ({
      path: issue.path.map(String),
      code: issue.code,
      message: issue.message,
    })),
  })
}

export function parseWithZod<SchemaType extends z.ZodTypeAny>(
  schema: SchemaType,
  value: unknown,
): z.output<SchemaType> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw createValidationException(result.error)
  }

  return result.data
}

export class ZodValidationPipe<SchemaType extends z.ZodTypeAny>
  implements PipeTransform
{
  constructor(private readonly schema: SchemaType) {}

  transform(value: unknown): z.output<SchemaType> {
    return parseWithZod(this.schema, value)
  }
}
