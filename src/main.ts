import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import type { Env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService) as ConfigService<Env, true>
  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0')
}
bootstrap()
