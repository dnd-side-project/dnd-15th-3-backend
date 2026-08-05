import { RequestMethod } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { getCorsOrigins } from './config/cors'
import type { Env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
    ],
  })
  const config = app.get(ConfigService) as ConfigService<Env, true>
  app.enableCors({
    origin: getCorsOrigins(config.get('CORS_ORIGINS', { infer: true })),
  })

  const swaggerConfig = new DocumentBuilder()
    .setTitle('모모(momo) API')
    .setDescription(
      'Figma 화면 흐름을 기준으로 작성한 모임 생성·참여 API 명세입니다. MOCK_API_ENABLED=true로 실행하면 프론트엔드 화면 구현용 고정 fixture를 반환합니다.',
    )
    .setVersion('0.0.1')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true })

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0')
}
bootstrap()
