import { Injectable, NotImplementedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'

@Injectable()
export class MockApiService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get enabled() {
    return this.config.get('MOCK_API_ENABLED', { infer: true })
  }

  requireEnabled() {
    if (!this.enabled) {
      throw new NotImplementedException(
        'Swagger 명세 단계입니다. MOCK_API_ENABLED=true로 실행하면 고정 fixture를 반환합니다.',
      )
    }
  }
}
