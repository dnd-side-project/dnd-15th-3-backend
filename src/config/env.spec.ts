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
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  MEDIA_BUCKET_NAME: 'momo-media-test',
  // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
  MEDIA_PUBLIC_BASE_URL:
    'https://objectstorage.ap-hyderabad-1.oraclecloud.com/n/namespace/b/momo-media-test/o/',
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
      expect(env.MEDIA_BUCKET_NAME).toBe('momo-media-test')
      expect(env.MEDIA_PUBLIC_BASE_URL).toContain('/momo-media-test/o/')
      expect(env.KAKAO_REST_API_KEY).toBe('')
      expect(env.GOOGLE_PLACES_API_KEY).toBe('')
      expect(env.PLACE_PHOTO_PREVIEW_CONCURRENCY).toBe(10)
      expect(env.OPENAI_API_KEY).toBe('')
      expect(env.OPENAI_MODEL).toBe('')
      expect(env.OPENAI_BASE_URL).toBe('https://api.openai.com/v1')
      expect(env.OPENAI_TIMEOUT_MS).toBe(15000)
      expect(env.INVITATION_BASE_URL).toBe('https://momo.example/invite')
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

    it('사진 동시 조회 수를 안전한 범위로 제한한다', () => {
      expect(() =>
        validateEnv({
          ...baseConfig,
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          PLACE_PHOTO_PREVIEW_CONCURRENCY: 0,
        }),
      ).toThrow('Invalid environment variables')
      expect(() =>
        validateEnv({
          ...baseConfig,
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          PLACE_PHOTO_PREVIEW_CONCURRENCY: 21,
        }),
      ).toThrow('Invalid environment variables')
    })

    it('does not require OCI_S3_ENDPOINT', () => {
      expect(() => validateEnv(baseConfig)).not.toThrow()
    })

    it('OpenAI API key와 model 중 하나만 설정하면 거부한다', () => {
      expect(() =>
        validateEnv({
          ...baseConfig,
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          OPENAI_API_KEY: 'test-key',
        }),
      ).toThrow('OPENAI_MODEL')
    })

    it('requires a media bucket name', () => {
      const { MEDIA_BUCKET_NAME, ...config } = baseConfig
      expect(() => validateEnv(config)).toThrow('Invalid environment variables')
    })

    it('requires an OCI native public base URL ending in /o/', () => {
      expect(() =>
        validateEnv({
          ...baseConfig,
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          MEDIA_PUBLIC_BASE_URL:
            'https://objectstorage.example/n/namespace/b/momo-media-test',
        }),
      ).toThrow('Invalid environment variables')
    })

    it('requires the public base URL to identify the configured media bucket', () => {
      expect(() =>
        validateEnv({
          ...baseConfig,
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          MEDIA_PUBLIC_BASE_URL:
            'https://objectstorage.example/n/namespace/b/another-bucket/o/',
        }),
      ).toThrow('Invalid environment variables')
    })

    it.each(['?', '#', '?token=unexpected', '#unexpected'])(
      'rejects a public base URL with %s',
      (suffix) => {
        expect(() =>
          validateEnv({
            ...baseConfig,
            // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
            MEDIA_PUBLIC_BASE_URL: `${baseConfig.MEDIA_PUBLIC_BASE_URL}${suffix}`,
          }),
        ).toThrow('Invalid environment variables')
      },
    )
  })
})
