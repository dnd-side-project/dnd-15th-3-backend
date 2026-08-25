import { z } from 'zod'

export const coerceBoolean = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim()
      return lower === 'true' || lower === '1'
    }
    return false
  })
  .default(false)

function requiredInProduction<T extends z.ZodString>(schema: T) {
  return schema.refine(
    (val) => {
      const nodeEnv = process.env.NODE_ENV
      return nodeEnv !== 'production' || val.length > 0
    },
    { message: 'Required in production' },
  )
}

const envSchemaBase = z.object({
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  SERVICE_NAME: z.string().trim().min(1).default('momo-api'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  LOG_LEVEL: z
    .enum(['error', 'warn', 'log', 'debug', 'verbose'])
    .default('log'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  METRICS_ENABLED: coerceBoolean,
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  METRICS_PORT: z.coerce.number().int().min(1).max(65535).default(9464),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  CORS_ORIGINS: z.string().trim().min(1),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  KAKAO_REST_API_KEY: z.string().trim().default(''),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  GOOGLE_PLACES_API_KEY: z.string().trim().default(''),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  PLACE_PHOTO_PREVIEW_CONCURRENCY: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10),
  // Optional OpenAI questionnaire generation. Both key and model must be set
  // to enable it; otherwise the curated fallback generator is used.
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OPENAI_API_KEY: z.string().trim().default(''),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OPENAI_MODEL: z.string().trim().default(''),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OPENAI_BASE_URL: z.string().trim().url().default('https://api.openai.com/v1'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OPENAI_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(30000)
    .default(15000),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  INVITATION_BASE_URL: z
    .string()
    .trim()
    .url()
    .default('https://momo.example/invite'),

  // Database
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  DB_HOST: z.string().default('localhost'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  DB_USERNAME: z.string().default('postgres'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  DB_PASSWORD: z.string().default(''),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  DB_DATABASE: z.string().default('postgres'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  DB_SSL: coerceBoolean,
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  DB_SSL_CA: z.string().optional(),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  DB_SYNCHRONIZE: coerceBoolean,

  // OCI Object Storage
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_REGION: z.string().default('ap-hyderabad-1'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_NAMESPACE: requiredInProduction(z.string()),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_S3_ACCESS_KEY: requiredInProduction(z.string()),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_S3_SECRET_KEY: requiredInProduction(z.string()),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  MEDIA_BUCKET_NAME: z.string().trim().min(1),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  MEDIA_PUBLIC_BASE_URL: z.string().trim().url(),
})

const envSchema = envSchemaBase.superRefine((config, context) => {
  const hasOpenAiKey = config.OPENAI_API_KEY.length > 0
  const hasOpenAiModel = config.OPENAI_MODEL.length > 0
  if (hasOpenAiKey !== hasOpenAiModel) {
    context.addIssue({
      code: 'custom',
      path: [hasOpenAiKey ? 'OPENAI_MODEL' : 'OPENAI_API_KEY'],
      message: 'OPENAI_API_KEY와 OPENAI_MODEL은 함께 설정해야 합니다',
    })
  }

  let publicUrl: URL
  try {
    publicUrl = new URL(config.MEDIA_PUBLIC_BASE_URL)
  } catch {
    return
  }

  const expectedPathSuffix = `/b/${encodeURIComponent(config.MEDIA_BUCKET_NAME)}/o/`
  if (
    config.MEDIA_PUBLIC_BASE_URL.includes('?') ||
    config.MEDIA_PUBLIC_BASE_URL.includes('#') ||
    !publicUrl.pathname.endsWith(expectedPathSuffix)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['MEDIA_PUBLIC_BASE_URL'],
      message:
        'Must be an OCI native object URL for MEDIA_BUCKET_NAME ending in /o/ without a query or fragment',
    })
  }
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return result.data
}
