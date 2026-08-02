import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'
import { CourseGeneratorService } from './llm/course-generator.service'
import {
  CloudflareLlmClient,
  LLM_CLIENT,
  LlmClient,
  type LlmClientPort,
} from './llm/llm-client'
import { LlmProviderValidator } from './llm/llm-provider.validator'

@Module({
  providers: [
    {
      provide: LLM_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): LlmClientPort => {
        const provider = config.get('LLM_PROVIDER', { infer: true })
        if (provider === 'cloudflare') {
          return new CloudflareLlmClient({
            accountId: config.get('CLOUDFLARE_ACCOUNT_ID', { infer: true }),
            apiToken: config.get('CLOUDFLARE_API_TOKEN', { infer: true }),
            model: config.get('CLOUDFLARE_MODEL', { infer: true }),
            temperature: config.get('LLM_TEMPERATURE', { infer: true }),
            maxTokens: config.get('LLM_MAX_TOKENS', { infer: true }),
          })
        }

        return new LlmClient({
          apiKey: config.get('LLM_API_KEY', { infer: true }),
          baseUrl: config.get('LLM_BASE_URL', { infer: true }),
          model: config.get('LLM_MODEL', { infer: true }),
          temperature: config.get('LLM_TEMPERATURE', { infer: true }),
          maxTokens: config.get('LLM_MAX_TOKENS', { infer: true }),
        })
      },
    },
    CourseGeneratorService,
    LlmProviderValidator,
  ],
  exports: [CourseGeneratorService],
})
export class CourseModule {}
