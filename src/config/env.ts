import { z } from 'zod'

const envSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
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
