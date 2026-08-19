import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Repository } from 'typeorm'
import { PlaceException } from './exception/place.exception'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlaceRepository } from './place.repository'
import type { PlaceSearchRequest } from './schema/place-search-request.schema'
import {
  type PlaceSearchResponse,
  placeSearchResponseSchema,
} from './schema/place-search-response.schema'
import { PlaceSyncService } from './sync/place-sync.service'

@Injectable()
export class PlaceService {
  constructor(
    @InjectRepository(MeetingLocation)
    private readonly meetingLocationRepository: Repository<MeetingLocation>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    private readonly placeRepository: PlaceRepository,
    private readonly placeSyncService: PlaceSyncService,
  ) {}

  async searchPlaces(
    request: PlaceSearchRequest,
  ): Promise<PlaceSearchResponse> {
    const participant = await this.participantRepository.findOne({
      where: {
        meeting: { id: request.meetingId },
        accessToken: request.accessToken,
      },
    })

    if (!participant) {
      throw new CommonException(CommonErrorCode.authenticationFailed)
    }

    const meetingLocation = await this.meetingLocationRepository.findOne({
      where: { meeting: { id: request.meetingId } },
    })

    if (!meetingLocation) {
      throw new PlaceException(PlaceErrorCode.meetingLocationNotFound)
    }

    const result = await this.placeRepository.findNearby(
      request,
      meetingLocation.latitude,
      meetingLocation.longitude,
    )
    const collection = await this.placeSyncService.getStatus(
      request.meetingId,
      meetingLocation.syncVersion,
    )

    const response = {
      items: result.items,
      page: request.page,
      size: request.size,
      total: result.total,
      hasNext: request.page * request.size < result.total,
      collectionStatus: collection.status,
      lastSyncedAt: collection.lastSyncedAt,
    }

    const parsedResponse = placeSearchResponseSchema.safeParse(response)
    if (!parsedResponse.success) {
      throw new PlaceException(PlaceErrorCode.invalidSearchResponse)
    }

    return parsedResponse.data
  }
}
