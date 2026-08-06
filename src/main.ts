import { RequestMethod } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { getCorsOrigins } from './config/cors'
import type { Env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api/v1', {
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
    .setTitle('dnd-15th-3-backend API')
    .setDescription('API documentation')
    .setVersion('0.0.1')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true })

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0')
}
bootstrap()
