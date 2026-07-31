import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import type { Env } from './config/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService) as ConfigService<Env, true>

  const swaggerConfig = new DocumentBuilder()
    .setTitle('dnd-15th-3-backend API')
    .setDescription('API documentation')
    .setVersion('0.0.1')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document)

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0')
}
bootstrap()
