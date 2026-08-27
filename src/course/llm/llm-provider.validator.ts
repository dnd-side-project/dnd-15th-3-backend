import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common'
import { LLM_CLIENT, type LlmClientPort, LlmProviderError } from './llm-client'

export class LlmProviderValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmProviderValidationError'
  }
}

@Injectable()
export class LlmProviderValidator implements OnApplicationBootstrap {
  private readonly logger = new Logger(LlmProviderValidator.name)

  constructor(@Inject(LLM_CLIENT) private readonly client: LlmClientPort) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.client.metadata.isConfigured) {
      this.logger.warn(
        `${this.client.metadata.provider} LLM 설정이 비어 있어 provider 검증을 건너뜁니다.`,
      )
      return
    }

    try {
      await this.validateModel()
      await this.validateJsonSupport()
    } catch (error) {
      if (error instanceof LlmProviderValidationError) {
        this.logger.error(error.message)
        throw error
      }
      throw error
    }
  }

  async validateModel(): Promise<void> {
    try {
      await this.client.validateModel()
    } catch (error) {
      if (
        error instanceof LlmProviderError &&
        error.code === 'llm_model_not_found'
      ) {
        throw new LlmProviderValidationError(error.message)
      }
      throw error
    }
  }

  async validateJsonSupport(): Promise<void> {
    await this.client.probeJson()
  }
}
