import { z } from 'zod'

export const MAX_STORAGE_URL_EXPIRES_IN = 3600
export const DEFAULT_UPLOAD_URL_EXPIRES_IN = 300
export const DEFAULT_DOWNLOAD_URL_EXPIRES_IN = 3600

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/
const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z\d+.-]*:/

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1f || code === 0x7f
  })
}

export const storageObjectKeySchema = z
  .string()
  .trim()
  .min(1, '객체 키는 비어 있을 수 없습니다.')
  .max(1024, '객체 키가 너무 깁니다.')
  .refine(
    (key) =>
      !key.startsWith('/') &&
      !key.startsWith('\\') &&
      !WINDOWS_ABSOLUTE_PATH_PATTERN.test(key) &&
      !URI_SCHEME_PATTERN.test(key),
    { message: '객체 키는 안전한 상대 경로여야 합니다.' },
  )
  .refine((key) => !key.includes('\\'), {
    message: '객체 키에는 백슬래시를 사용할 수 없습니다.',
  })
  .refine((key) => !containsControlCharacter(key), {
    message: '객체 키에는 제어 문자를 사용할 수 없습니다.',
  })
  .refine(
    (key) =>
      !key.split('/').some((segment) => segment === '.' || segment === '..'),
    { message: '객체 키에 안전하지 않은 경로 세그먼트가 있습니다.' },
  )

export const storageContentTypeSchema = z
  .string()
  .trim()
  .min(1, 'MIME 타입은 비어 있을 수 없습니다.')
  .regex(/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/, '유효한 MIME 타입이어야 합니다.')

export const storageExpiresInSchema = z
  .number()
  .int()
  .min(1, 'URL 만료 시간은 1초 이상이어야 합니다.')
  .max(
    MAX_STORAGE_URL_EXPIRES_IN,
    `URL 만료 시간은 ${MAX_STORAGE_URL_EXPIRES_IN}초 이하여야 합니다.`,
  )

export const getUploadUrlRequestSchema = z
  .object({
    key: storageObjectKeySchema,
    contentType: storageContentTypeSchema.optional(),
    expiresIn: storageExpiresInSchema.optional(),
  })
  .strict()

export const getDownloadUrlRequestSchema = z
  .object({
    key: storageObjectKeySchema,
    expiresIn: storageExpiresInSchema.optional(),
  })
  .strict()

export const getPublicUrlRequestSchema = z
  .object({ key: storageObjectKeySchema })
  .strict()

export const deleteObjectRequestSchema = z
  .object({ key: storageObjectKeySchema })
  .strict()

export type GetUploadUrlRequest = z.output<typeof getUploadUrlRequestSchema>
export type GetDownloadUrlRequest = z.output<typeof getDownloadUrlRequestSchema>
