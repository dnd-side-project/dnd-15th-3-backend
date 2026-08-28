import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { KakaoModule } from 'src/kakao/kakao.module'
import { MediaModule } from 'src/media/media.module'
import { MeetingAccessModule } from 'src/meeting/access/meeting-access.module'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Place } from './entities/place.entity'
import { PlaceImage } from './entities/place-image.entity'
import { KakaoImagePhotoProvider } from './photo/kakao-image-photo.provider'
import { PlacePhotoService } from './photo/place-photo.service'
import { TourPlacePhotoProvider } from './photo/tour-place-photo.provider'
import { PlaceController } from './place.controller'
import { PlaceRepository } from './place.repository'
import { PlaceService } from './place.service'
import { PlaceImageService } from './place-image.service'
import { PlaceLiveDataService } from './place-live-data.service'
import { KakaoPlacesProvider } from './provider/kakao-places.provider'

@Module({
  imports: [
    KakaoModule,
    MediaModule,
    MeetingAccessModule,
    TypeOrmModule.forFeature([
      MeetingLocation,
      MeetingParticipant,
      Category,
      CourseCategoryStep,
      MeetingPlaceRecommendation,
      Place,
      PlaceImage,
    ]),
  ],
  controllers: [PlaceController],
  providers: [
    PlaceRepository,
    PlaceService,
    PlaceImageService,
    PlaceLiveDataService,
    TourPlacePhotoProvider,
    KakaoImagePhotoProvider,
    PlacePhotoService,
    KakaoPlacesProvider,
  ],
  exports: [
    PlaceRepository,
    PlaceImageService,
    PlaceLiveDataService,
    PlacePhotoService,
  ],
})
export class PlaceModule {}
