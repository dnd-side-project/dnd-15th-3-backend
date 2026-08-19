import { Module } from '@nestjs/common'
import { KakaoLocalService } from './kakao-local.service'

@Module({
  providers: [KakaoLocalService],
  exports: [KakaoLocalService],
})
export class KakaoModule {}
