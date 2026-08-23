import { RequestMethod } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { createApplicationLogger } from './common/observability/application-logger'
import { MetricsService } from './common/observability/metrics.service'
import { createRequestObservabilityMiddleware } from './common/observability/request-observability.middleware'
import { getCorsOrigins } from './config/cors'
import type { Env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const config = app.get(ConfigService) as ConfigService<Env, true>

  app.useLogger(
    createApplicationLogger({
      serviceName: config.get('SERVICE_NAME', { infer: true }),
      format: config.get('LOG_FORMAT', { infer: true }),
      level: config.get('LOG_LEVEL', { infer: true }),
    }),
  )
  app.use(createRequestObservabilityMiddleware(app.get(MetricsService)))

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/storage', method: RequestMethod.GET },
    ],
  })
  app.enableCors({
    origin: getCorsOrigins(config.get('CORS_ORIGINS', { infer: true })),
  })

  const swaggerConfig = new DocumentBuilder()
    .setTitle('모모(momo) API')
    .setVersion('0.0.1')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true })

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0')
}
bootstrap()
