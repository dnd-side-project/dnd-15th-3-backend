import { coerceBoolean } from 'src/config/env'
import { z } from 'zod'

const statisticsWorkerEnvSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Core database (Outbox source of truth)
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
  STATS_DB_HOST: z.string().default('localhost'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  STATS_DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  STATS_DB_USERNAME: z.string().default('postgres'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  STATS_DB_PASSWORD: z.string().default(''),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  STATS_DB_DATABASE: z.string().default('postgres'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  STATS_DB_SSL: coerceBoolean,
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  STATS_DB_SSL_CA: z.string().optional(),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  STATS_DB_SYNCHRONIZE: coerceBoolean,
})

export type StatisticsWorkerEnv = z.infer<typeof statisticsWorkerEnvSchema>

export function validateStatisticsWorkerEnv(
  config: Record<string, unknown>,
): StatisticsWorkerEnv {
  const result = statisticsWorkerEnvSchema.safeParse(config)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return result.data
}
