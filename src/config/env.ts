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

const envSchema = z
  .object({
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

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
    OCI_BUCKET_NAME_DEV: z.string().default('momo-bucket-dev'),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    OCI_BUCKET_NAME_PROD: z.string().default('momo-bucket-prod'),

    // LLM
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    LLM_PROVIDER: z.enum(['nvidia', 'cloudflare']).default('cloudflare'),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    LLM_BASE_URL: z
      .string()
      .url()
      .default('https://integrate.api.nvidia.com/v1'),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    LLM_API_KEY: z.string().default(''),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    LLM_MODEL: z.string().default('nvidia/nemotron-3-ultra-550b-a55b'),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    LLM_MAX_TOKENS: z.coerce.number().int().min(128).max(8192).default(2048),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    CLOUDFLARE_ACCOUNT_ID: z.string().default(''),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    CLOUDFLARE_API_TOKEN: z.string().default(''),
    // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
    CLOUDFLARE_MODEL: z
      .string()
      .default('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return

    if (value.LLM_PROVIDER === 'nvidia' && value.LLM_API_KEY.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['LLM_API_KEY'],
        message: 'Required when LLM_PROVIDER is nvidia in production',
      })
    }

    if (value.LLM_PROVIDER === 'cloudflare') {
      if (value.CLOUDFLARE_ACCOUNT_ID.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['CLOUDFLARE_ACCOUNT_ID'],
          message: 'Required when LLM_PROVIDER is cloudflare in production',
        })
      }
      if (value.CLOUDFLARE_API_TOKEN.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['CLOUDFLARE_API_TOKEN'],
          message: 'Required when LLM_PROVIDER is cloudflare in production',
        })
      }
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
