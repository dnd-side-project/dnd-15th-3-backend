import { z } from 'zod'

const coerceBoolean = z
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

function requiredInProduction<T extends z.ZodTypeAny>(schema: T) {
  return z.union([
    schema,
    z.string().refine(
      (val) => {
        const nodeEnv = process.env.NODE_ENV
        return nodeEnv !== 'production' || val.length > 0
      },
      { message: 'Required in production' },
    ),
  ])
}

const envSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  CORS_ORIGINS: z.string().trim().min(1),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  KAKAO_REST_API_KEY: z.string().trim().default(''),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  GOOGLE_PLACES_API_KEY: z.string().trim().default(''),
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
  MEDIA_PUBLIC_BASE_URL: z
    .string()
    .trim()
    .url()
    .refine((value) => new URL(value).pathname.endsWith('/o/'), {
      message: 'Must include the OCI native object URL path ending in /o/',
    }),
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
