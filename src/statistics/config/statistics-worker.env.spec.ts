import { validateStatisticsWorkerEnv } from './statistics-worker.env'

describe('validateStatisticsWorkerEnv', () => {
  describe('defaults', () => {
    it('applies defaults for optional values', () => {
      const env = validateStatisticsWorkerEnv({})
      expect(env.NODE_ENV).toBe('development')
      expect(env.STATS_DB_HOST).toBe('localhost')
      expect(env.STATS_DB_PORT).toBe(5432)
      expect(env.STATS_DB_USERNAME).toBe('postgres')
      expect(env.STATS_DB_PASSWORD).toBe('')
      expect(env.STATS_DB_DATABASE).toBe('postgres')
      expect(env.STATS_DB_SSL).toBe(false)
      expect(env.STATS_DB_SYNCHRONIZE).toBe(false)
    })

    it('does not require media, OCI, or CORS values', () => {
      expect(() => validateStatisticsWorkerEnv({})).not.toThrow()
    })
  })

  describe('coerceBoolean', () => {
    it.each(['true', '1', true, 'True'])('parses %p as true', (value) => {
      const env = validateStatisticsWorkerEnv({
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        STATS_DB_SSL: value,
      })
      expect(env.STATS_DB_SSL).toBe(true)
    })

    it.each(['false', '0', false, '', undefined])(
      'parses %p as false',
      (value) => {
        const env = validateStatisticsWorkerEnv({
          // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
          STATS_DB_SSL: value,
        })
        expect(env.STATS_DB_SSL).toBe(false)
      },
    )
  })

  describe('validation errors', () => {
    it('throws when STATS_DB_PORT is out of range', () => {
      expect(() =>
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        validateStatisticsWorkerEnv({ STATS_DB_PORT: 70000 }),
      ).toThrow('Invalid environment variables')
    })

    it('throws when STATS_DB_PORT is not an integer', () => {
      expect(() =>
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        validateStatisticsWorkerEnv({ STATS_DB_PORT: 'abc' }),
      ).toThrow('Invalid environment variables')
    })

    it('rejects an invalid NODE_ENV value', () => {
      expect(() =>
        // biome-ignore lint/style/useNamingConvention: 환경 변수 이름과 동일하게 유지
        validateStatisticsWorkerEnv({ NODE_ENV: 'staging' }),
      ).toThrow('Invalid environment variables')
    })
  })
})
