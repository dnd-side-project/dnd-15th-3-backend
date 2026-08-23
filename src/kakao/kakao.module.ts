import { Module } from '@nestjs/common'
import { KakaoImageSearchService } from './kakao-image-search.service'
import { KakaoLocalService } from './kakao-local.service'
import { KakaoWalkingCourseService } from './kakao-walking-course.service'
import { KakaoWalkingDistanceService } from './kakao-walking-distance.service'

@Module({
  providers: [
    KakaoImageSearchService,
    KakaoLocalService,
    KakaoWalkingCourseService,
    KakaoWalkingDistanceService,
  ],
  exports: [
    KakaoImageSearchService,
    KakaoLocalService,
    KakaoWalkingCourseService,
    KakaoWalkingDistanceService,
  ],
})
export class KakaoModule {}
