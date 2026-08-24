import { Module } from '@nestjs/common'
import { KakaoLocalService } from './kakao-local.service'
import { KakaoWalkingCourseService } from './kakao-walking-course.service'

@Module({
  providers: [KakaoLocalService, KakaoWalkingCourseService],
  exports: [KakaoLocalService, KakaoWalkingCourseService],
})
export class KakaoModule {}
