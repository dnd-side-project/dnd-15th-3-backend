import { Module } from '@nestjs/common'
import { KakaoImageSearchService } from './kakao-image-search.service'
import { KakaoLocalService } from './kakao-local.service'
import { KakaoWalkingCourseService } from './kakao-walking-course.service'

@Module({
  providers: [
    KakaoImageSearchService,
    KakaoLocalService,
    KakaoWalkingCourseService,
  ],
  exports: [
    KakaoImageSearchService,
    KakaoLocalService,
    KakaoWalkingCourseService,
  ],
})
export class KakaoModule {}
