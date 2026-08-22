import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import type { CategorySlug } from 'src/category/enums/category-slug.enum'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { assertAccessToken } from 'src/meeting/access/meeting-access.utils'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { Repository } from 'typeorm'
import type { PlaceSearchResultDto } from './dto/place-search-result.dto'
import { Place } from './entities/place.entity'
import { PlaceSource } from './enums/place-source.enum'
import { PlaceException } from './exception/place.exception'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlaceImageService } from './place-image.service'
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
    private readonly placeLiveDataService: PlaceLiveDataService,
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
      throw new CommonException(CommonErrorCode.authenticationFailed)
    }

    const meetingLocation = await this.meetingLocationRepository.findOne({
      where: { meeting: { id: request.meetingId } },
    })

    if (!meetingLocation) {
      throw new PlaceException(PlaceErrorCode.meetingLocationNotFound)
    }

    const categories = await this.findSearchCategories(request)
    const result = await this.placeLiveDataService.searchKakao(
      {
        latitude: meetingLocation.latitude,
        longitude: meetingLocation.longitude,
      },
      categories,
    )
    const normalizedQuery = request.q?.toLocaleLowerCase('ko')
    const filtered = normalizedQuery
      ? result.places.filter((place) =>
          [place.name, place.address, place.roadAddress]
            .filter((value): value is string => Boolean(value))
            .some((value) =>
              value.toLocaleLowerCase('ko').includes(normalizedQuery),
            ),
        )
      : result.places
    const offset = (request.page - 1) * request.size
    const pageItems = filtered.slice(offset, offset + request.size)

    const response = {
      items: pageItems.map((place) => ({
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
        previewUrl: place.previewUrl,
        source: place.source,
        providerPlaceId: place.providerPlaceId,
        roadAddress: place.roadAddress,
        phone: place.phone,
        placeUrl: place.placeUrl,
      })),
      page: request.page,
      size: request.size,
      total: filtered.length,
      hasNext: request.page * request.size < filtered.length,
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
    meetingId: string,
    accessToken: string,
  ): Promise<PlaceSearchResultDto> {
    assertAccessToken(accessToken)
    const participant = await this.participantRepository.findOne({
      where: {
        meeting: { id: meetingId },
        accessToken: accessToken.trim(),
      },
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
      where: { meeting: { id: meetingId } },
    })
    if (!meetingLocation) {
      throw new PlaceException(PlaceErrorCode.meetingLocationNotFound)
    }
    const resolved = await this.placeLiveDataService.resolvePlace(place, {
      latitude: meetingLocation.latitude,
      longitude: meetingLocation.longitude,
    })

    const imageUrls =
      place.source === PlaceSource.Kakao
        ? []
        : await this.placeImageService.getImageUrls(placeId)

    return {
      placeId: place.id,
      category: place.category.name,
      categorySlug: place.category.slug as CategorySlug,
      name: resolved.name,
      address: resolved.address,
      imageUrls,
      previewUrl: resolved.previewUrl,
      source: resolved.source,
      providerPlaceId: resolved.providerPlaceId,
      roadAddress: resolved.roadAddress,
      phone: resolved.phone,
      placeUrl: resolved.placeUrl,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
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
