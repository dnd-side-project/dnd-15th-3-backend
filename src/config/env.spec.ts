import { validateEnv } from './env'

const baseConfig = {
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  NODE_ENV: 'test',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_NAMESPACE: 'namespace',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_S3_ACCESS_KEY: 'access-key',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_S3_SECRET_KEY: 'secret-key',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  LLM_API_KEY: '',
}

describe('validateEnv', () => {
  describe('defaults', () => {
    it('applies defaults for optional values', () => {
      const env = validateEnv(baseConfig)
      expect(env.PORT).toBe(3000)
      expect(env.DB_HOST).toBe('localhost')
      expect(env.DB_PORT).toBe(5432)
      expect(env.DB_USERNAME).toBe('postgres')
      expect(env.DB_DATABASE).toBe('postgres')
      expect(env.OCI_REGION).toBe('ap-hyderabad-1')
      expect(env.OCI_BUCKET_NAME_DEV).toBe('momo-bucket-dev')
      expect(env.OCI_BUCKET_NAME_PROD).toBe('momo-bucket-prod')
      expect(env.LLM_PROVIDER).toBe('cloudflare')
      expect(env.LLM_BASE_URL).toBe('https://integrate.api.nvidia.com/v1')
      expect(env.LLM_MODEL).toBe('nvidia/nemotron-3-ultra-550b-a55b')
      expect(env.LLM_TEMPERATURE).toBe(0.2)
      expect(env.CLOUDFLARE_MODEL).toBe(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      )
    })

    it('defaults NODE_ENV to development when not provided', () => {
      const { NODE_ENV, ...rest } = baseConfig
      const env = validateEnv(rest)
      expect(env.NODE_ENV).toBe('development')
    })
  })

  describe('coerceBoolean', () => {
    it.each(['true', '1', true, 'True'])('parses %p as true', (value) => {
      const env = validateEnv({
        ...baseConfig,
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        DB_SSL: value,
      })
      expect(env.DB_SSL).toBe(true)
    })

    it.each(['false', '0', false, '', undefined])(
      'parses %p as false',
      (value) => {
        const env = validateEnv({
          ...baseConfig,
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          DB_SSL: value,
        })
        expect(env.DB_SSL).toBe(false)
      },
    )
  })

  describe('requiredInProduction', () => {
    it('allows empty OCI values when NODE_ENV is not production', () => {
      const env = validateEnv({
        ...baseConfig,
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        NODE_ENV: 'development',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        OCI_NAMESPACE: '',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        OCI_S3_ACCESS_KEY: '',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        OCI_S3_SECRET_KEY: '',
      })
      expect(env.OCI_NAMESPACE).toBe('')
    })

    it('rejects missing OCI values when NODE_ENV is production', () => {
      const config = {
        ...baseConfig,
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        NODE_ENV: 'production',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        OCI_NAMESPACE: undefined,
      }
      expect(() => validateEnv(config)).toThrow('Invalid environment variables')
    })
  })

  describe('validation errors', () => {
    it('throws when PORT is out of range', () => {
      // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
      expect(() => validateEnv({ ...baseConfig, PORT: 70000 })).toThrow(
        'Invalid environment variables',
      )
    })

    it('throws when DB_PORT is not an integer', () => {
      // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
      expect(() => validateEnv({ ...baseConfig, DB_PORT: 'abc' })).toThrow(
        'Invalid environment variables',
      )
    })

    it('does not require OCI_S3_ENDPOINT', () => {
      expect(() => validateEnv(baseConfig)).not.toThrow()
    })
  })

  describe('LLM', () => {
    it('allows empty selected provider credentials when NODE_ENV is not production', () => {
      const env = validateEnv({
        ...baseConfig,
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        NODE_ENV: 'development',
      })
      expect(env.LLM_API_KEY).toBe('')
      expect(env.CLOUDFLARE_ACCOUNT_ID).toBe('')
    })

    it('rejects missing NVIDIA LLM_API_KEY when NVIDIA is selected in production', () => {
      const config = {
        ...baseConfig,
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        NODE_ENV: 'production',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        LLM_PROVIDER: 'nvidia',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        LLM_API_KEY: undefined,
      }
      expect(() => validateEnv(config)).toThrow('Invalid environment variables')
    })

    it('rejects missing Cloudflare credentials when Cloudflare is selected in production', () => {
      const config = {
        ...baseConfig,
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        NODE_ENV: 'production',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        LLM_PROVIDER: 'cloudflare',
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        CLOUDFLARE_ACCOUNT_ID: undefined,
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        CLOUDFLARE_API_TOKEN: undefined,
      }
      expect(() => validateEnv(config)).toThrow('Invalid environment variables')
    })

    it('rejects invalid LLM_BASE_URL', () => {
      const invalidConfig = {
        ...baseConfig,
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        LLM_BASE_URL: 'not-a-url',
      }
      expect(() => validateEnv(invalidConfig)).toThrow(
        'Invalid environment variables',
      )
    })

    it('rejects LLM_TEMPERATURE out of range', () => {
      // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
      expect(() => validateEnv({ ...baseConfig, LLM_TEMPERATURE: 3 })).toThrow(
        'Invalid environment variables',
      )
    })

    it('rejects an unknown LLM provider', () => {
      expect(() =>
        validateEnv({
          ...baseConfig,
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          LLM_PROVIDER: 'unknown',
        }),
      ).toThrow('Invalid environment variables')
    })
  })
})
