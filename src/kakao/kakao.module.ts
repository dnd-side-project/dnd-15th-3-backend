import { Module } from '@nestjs/common'
import { KakaoLocalService } from './kakao-local.service'
import { KakaoWalkingCourseService } from './kakao-walking-course.service'
import { KakaoWalkingDistanceService } from './kakao-walking-distance.service'

@Module({
  providers: [
    KakaoLocalService,
    KakaoWalkingCourseService,
    KakaoWalkingDistanceService,
  ],
  exports: [
    KakaoLocalService,
    KakaoWalkingCourseService,
    KakaoWalkingDistanceService,
  ],
})
export class KakaoModule {}
