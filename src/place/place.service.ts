import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import type { CategorySlug } from 'src/category/enums/category-slug.enum'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from 'src/course/entities/meeting-place-recommendation.entity'
import { MeetingAccessService } from 'src/meeting/access/meeting-access.service'
import { assertAccessToken } from 'src/meeting/access/meeting-access.utils'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Repository } from 'typeorm'
import type { PlaceSearchResultDto } from './dto/place-search-result.dto'
import { Place } from './entities/place.entity'
import { PlaceSource } from './enums/place-source.enum'
import { PlaceException } from './exception/place.exception'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlacePhotoService } from './photo/place-photo.service'
import { PlaceLiveDataService } from './place-live-data.service'
import type { PlaceSearchRequest } from './schema/place-search-request.schema'
import {
  type PlaceSearchResponse,
  placeSearchResponseSchema,
} from './schema/place-search-response.schema'

@Injectable()
export class PlaceService {
  constructor(
    @InjectRepository(MeetingLocation)
    private readonly meetingLocationRepository: Repository<MeetingLocation>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(CourseCategoryStep)
    private readonly courseCategoryStepRepository: Repository<CourseCategoryStep>,
    @InjectRepository(MeetingPlaceRecommendation)
    private readonly meetingPlaceRecommendationRepository: Repository<MeetingPlaceRecommendation>,
    private readonly placeLiveDataService: PlaceLiveDataService,
    private readonly placePhotoService: PlacePhotoService,
    private readonly meetingAccessService: MeetingAccessService,
  ) {}

  async searchPlaces(
    request: PlaceSearchRequest,
  ): Promise<PlaceSearchResponse> {
    await this.meetingAccessService.findParticipant(
      request.meetingId,
      request.accessToken,
    )

    const meetingLocation = await this.meetingLocationRepository.findOne({
      where: { meeting: { id: request.meetingId } },
    })

    if (!meetingLocation) {
      throw new PlaceException(PlaceErrorCode.meetingLocationNotFound)
    }

    const categories = await this.findSearchCategories(request)
    const [result, recommendations] = await Promise.all([
      this.placeLiveDataService.searchKakao(
        {
          latitude: meetingLocation.latitude,
          longitude: meetingLocation.longitude,
        },
        categories,
        request.q,
      ),
      this.meetingPlaceRecommendationRepository.find({
        where: { meeting: { id: request.meetingId } },
        relations: { place: true },
      }),
    ])
    const recommendedPlaceIds = new Set(
      recommendations.map((recommendation) => recommendation.place.id),
    )
    const offset = (request.page - 1) * request.size
    const pageItems = result.places.slice(offset, offset + request.size)
    const previewPhotos =
      await this.placePhotoService.findPreviewPhotos(pageItems)

    const response = {
      items: pageItems.map((place) => {
        const previewPhoto = previewPhotos.get(place.id) ?? null
        return {
          id: place.id,
          name: place.name,
          address: place.address,
          category: {
            id: place.category.id,
            name: place.category.name,
            slug: place.category.slug,
          },
          latitude: place.latitude,
          longitude: place.longitude,
          distanceMeters: place.distanceMeters,
          previewUrl: previewPhoto?.url ?? null,
          previewPhoto,
          source: place.source,
          providerPlaceId: place.providerPlaceId,
          roadAddress: place.roadAddress,
          phone: place.phone,
          placeUrl: place.placeUrl,
          isRecommended: recommendedPlaceIds.has(place.id),
        }
      }),
      page: request.page,
      size: request.size,
      total: result.places.length,
      hasNext: request.page * request.size < result.places.length,
      collectionStatus: result.isComplete ? 'READY' : 'PARTIAL',
      lastSyncedAt: null,
      source: PlaceSource.Kakao,
      isLive: true,
      unsupportedCategorySlugs: result.unsupportedCategorySlugs,
    }

    const parsedResponse = placeSearchResponseSchema.safeParse(response)
    if (!parsedResponse.success) {
      throw new PlaceException(PlaceErrorCode.invalidSearchResponse)
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
      relations: { meeting: true },
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

    const meetingLocation = await this.meetingLocationRepository.findOne({
      where: { meeting: { id: participant.meeting.id } },
    })
    if (!meetingLocation) {
      throw new PlaceException(PlaceErrorCode.meetingLocationNotFound)
    }
    const [resolved, recommendation] = await Promise.all([
      this.placeLiveDataService.resolvePlace(place, {
        latitude: meetingLocation.latitude,
        longitude: meetingLocation.longitude,
      }),
      this.meetingPlaceRecommendationRepository.findOne({
        where: {
          meeting: { id: participant.meeting.id },
          place: { id: placeId },
        },
      }),
    ])

    const photos = await this.placePhotoService.findPhotos(resolved)
    const previewPhoto = photos[0] ?? null

    return {
      placeId: place.id,
      category: place.category.name,
      categorySlug: place.category.slug as CategorySlug,
      name: resolved.name,
      address: resolved.address,
      imageUrls: photos.map((photo) => photo.url),
      photos,
      previewUrl: previewPhoto?.url ?? null,
      previewPhoto,
      source: resolved.source,
      providerPlaceId: resolved.providerPlaceId,
      roadAddress: resolved.roadAddress,
      phone: resolved.phone,
      placeUrl: resolved.placeUrl,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      isRecommended: recommendation !== null,
    }
  }

  private async findSearchCategories(
    request: PlaceSearchRequest,
  ): Promise<Category[]> {
    if (request.categorySlug) {
      const category = await this.categoryRepository.findOne({
        where: { slug: request.categorySlug },
      })
      return category ? [category] : []
    }
    if (request.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: request.categoryId },
      })
      return category ? [category] : []
    }

    const steps = await this.courseCategoryStepRepository.find({
      where: { meeting: { id: request.meetingId } },
      relations: { category: true },
      order: { order: 'ASC' },
    })
    return [
      ...new Map(
        steps.map((step) => [step.category.id, step.category]),
      ).values(),
    ]
  }
}
