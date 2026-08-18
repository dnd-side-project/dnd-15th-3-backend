import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { CategorySlug } from 'src/category/enums/category-slug.enum'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { assertAccessToken } from 'src/meeting/access/meeting-access.utils'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Repository } from 'typeorm'
import type { PlaceSearchResultDto } from './dto/place-search-result.dto'
import { Place } from './entities/place.entity'
import { PlaceException } from './exception/place.exception'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlaceRepository } from './place.repository'
import { PlaceImageService } from './place-image.service'
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
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    private readonly placeSearchRepository: PlaceRepository,
    private readonly placeSyncService: PlaceSyncService,
    private readonly placeImageService: PlaceImageService,
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
      throw new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.')
    }

    const meetingLocation = await this.meetingLocationRepository.findOne({
      where: { meeting: { id: request.meetingId } },
    })

    if (!meetingLocation) {
      throw new NotFoundException(
        '해당 모임의 첫 만남 기준 위치를 찾을 수 없습니다.',
      )
    }

    const result = await this.placeSearchRepository.findNearby(
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
      throw new InternalServerErrorException(
        '장소 검색 결과 형식이 올바르지 않습니다.',
      )
    }

    return parsedResponse.data
  }

  async getPlaceDetail(
    placeId: string,
    accessToken: string,
  ): Promise<PlaceSearchResultDto> {
    assertAccessToken(accessToken)
    const participant = await this.participantRepository.findOne({
      where: { accessToken: accessToken.trim() },
    })
    if (!participant) {
      throw new CommonException(CommonErrorCode.authenticationFailed)
    }

    const place = await this.placeRepository.findOne({
      where: { id: placeId },
      relations: { category: true },
    })
    if (!place) {
      throw new PlaceException(PlaceErrorCode.notFound)
    }

    const imageUrls = await this.placeImageService.getImageUrls(placeId)

    return {
      placeId: place.id,
      category: place.category.name,
      categorySlug: place.category.slug as CategorySlug,
      name: place.name,
      address: place.address,
      imageUrls,
      previewUrl: place.previewUrl as string,
    }
  }
}
