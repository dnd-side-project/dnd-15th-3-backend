import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KakaoModule } from 'src/kakao/kakao.module'
import { MediaModule } from 'src/media/media.module'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Place } from './entities/place.entity'
import { PlaceImage } from './entities/place-image.entity'
import { PlaceSyncCoverage } from './entities/place-sync-coverage.entity'
import { PlaceSyncJob } from './entities/place-sync-job.entity'
import { PlaceSyncTileLease } from './entities/place-sync-tile-lease.entity'
import { PlaceController } from './place.controller'
import { PlaceRepository } from './place.repository'
import { PlaceService } from './place.service'
import { PlaceImageService } from './place-image.service'
import { GooglePlacesProvider } from './provider/google-places.provider'
import { PlaceSyncService } from './sync/place-sync.service'
import { PLACE_PROVIDER } from './sync/place-sync.tokens'
import { PlaceSyncWorker } from './sync/place-sync.worker'

@Module({
  imports: [
    KakaoModule,
    MediaModule,
    TypeOrmModule.forFeature([
      MeetingLocation,
      MeetingParticipant,
      Place,
      PlaceImage,
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
    GooglePlacesProvider,
    { provide: PLACE_PROVIDER, useExisting: GooglePlacesProvider },
    PlaceSyncService,
    PlaceSyncWorker,
  ],
  exports: [PlaceSyncService, PlaceRepository, PlaceImageService],
})
export class PlaceModule {}
