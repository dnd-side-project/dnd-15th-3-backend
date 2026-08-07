import { Module } from '@nestjs/common'
import { KakaoModule } from 'src/kakao/kakao.module'
import { CatalogController } from './catalog.controller'

@Module({
  imports: [KakaoModule],
  controllers: [CatalogController],
})
export class CatalogModule {}
