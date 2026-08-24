import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { KakaoModule } from 'src/kakao/kakao.module'
import { MediaModule } from 'src/media/media.module'
import { MeetingAccessModule } from 'src/meeting/access/meeting-access.module'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Place } from './entities/place.entity'
import { PlaceImage } from './entities/place-image.entity'
import { PlacePhotoMatch } from './entities/place-photo-match.entity'
import { PlaceSyncCoverage } from './entities/place-sync-coverage.entity'
import { PlaceSyncJob } from './entities/place-sync-job.entity'
import { PlaceSyncTileLease } from './entities/place-sync-tile-lease.entity'
import { GooglePlacePhotoProvider } from './photo/google-place-photo.provider'
import { PlacePhotoService } from './photo/place-photo.service'
import { PlaceController } from './place.controller'
import { PlaceRepository } from './place.repository'
import { PlaceService } from './place.service'
import { PlaceImageService } from './place-image.service'
import { PlaceLiveDataService } from './place-live-data.service'
import { GooglePlacesProvider } from './provider/google-places.provider'
import { KakaoPlacesProvider } from './provider/kakao-places.provider'
import { PlaceSyncService } from './sync/place-sync.service'
import { PLACE_PROVIDER } from './sync/place-sync.tokens'
import { PlaceSyncWorker } from './sync/place-sync.worker'

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
      Place,
      PlaceImage,
      PlacePhotoMatch,
      PlaceSyncCoverage,
      PlaceSyncJob,
      PlaceSyncTileLease,
    ]),
  ],
  controllers: [PlaceController],
  providers: [
    PlaceRepository,
    PlaceService,
    PlaceImageService,
    PlaceLiveDataService,
    GooglePlacePhotoProvider,
    PlacePhotoService,
    GooglePlacesProvider,
    KakaoPlacesProvider,
    // Kakao Local 검색 결과는 장소 ID와 URL 외에는 영구 저장할 수 없다.
    // 별도 허가 전까지 DB 수집 작업은 Google Provider만 사용한다.
    { provide: PLACE_PROVIDER, useExisting: GooglePlacesProvider },
    PlaceSyncService,
    PlaceSyncWorker,
  ],
  exports: [
    PlaceSyncService,
    PlaceRepository,
    PlaceImageService,
    PlaceLiveDataService,
    PlacePhotoService,
  ],
})
export class PlaceModule {}
