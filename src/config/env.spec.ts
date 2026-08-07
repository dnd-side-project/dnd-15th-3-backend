import { validateEnv } from './env'

const baseConfig = {
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  NODE_ENV: 'test',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  CORS_ORIGINS: 'http://localhost:5173',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_NAMESPACE: 'namespace',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_S3_ACCESS_KEY: 'access-key',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  OCI_S3_SECRET_KEY: 'secret-key',
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
      expect(env.KAKAO_REST_API_KEY).toBe('')
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
    it('rejects missing CORS_ORIGINS', () => {
      const { CORS_ORIGINS, ...config } = baseConfig
      expect(() => validateEnv(config)).toThrow('Invalid environment variables')
    })

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
})
