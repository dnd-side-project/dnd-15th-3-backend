import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { haversineDistanceMeters } from 'src/common/geo/haversine-distance'
import type { Point } from 'typeorm'
import { In, Repository } from 'typeorm'
import { Place } from './entities/place.entity'
import { PlaceSource } from './enums/place-source.enum'
import { PlaceException } from './exception/place.exception'
import { PlaceErrorCode } from './exception/place-error-code'
import { KakaoPlacesProvider } from './provider/kakao-places.provider'
import type { PlaceProviderPlace } from './provider/place-provider'
import { PLACE_SYNC_RADIUS_METERS } from './sync/place-sync.constants'

const KAKAO_REFERENCE_ADDRESS = 'KAKAO_PLACE_REFERENCE'
const KAKAO_REFERENCE_LOCATION: Point = {
  type: 'Point',
  coordinates: [0, 0],
}

export type PlaceSearchCenter = {
  latitude: number
  longitude: number
}

export type ResolvedPlace = {
  id: string
  source: PlaceSource
  providerPlaceId: string | null
  category: Category
  name: string
  address: string
  roadAddress: string | null
  latitude: number
  longitude: number
  phone: string | null
  placeUrl: string | null
  previewUrl: string | null
  distanceMeters: number
}

export type LivePlaceSearchResult = {
  places: ResolvedPlace[]
  isComplete: boolean
  unsupportedCategorySlugs: CategorySlug[]
}

@Injectable()
export class PlaceLiveDataService {
  constructor(
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    private readonly kakaoPlacesProvider: KakaoPlacesProvider,
  ) {}

  async searchKakao(
    center: PlaceSearchCenter,
    categories: Category[],
    query?: string,
    options?: { targetTotal?: number },
  ): Promise<LivePlaceSearchResult> {
    const lookupQuery = query?.trim() || undefined
    const supported = categories.filter((category) =>
      this.kakaoPlacesProvider.supportsCategory(category.slug as CategorySlug),
    )
    const unsupportedCategorySlugs = categories
      .filter(
        (category) =>
          !this.kakaoPlacesProvider.supportsCategory(
            category.slug as CategorySlug,
          ),
      )
      .map((category) => category.slug as CategorySlug)

    const results = await Promise.all(
      supported.map(async (category) => ({
        category,
        result: await this.kakaoPlacesProvider.searchNearby({
          ...center,
          radiusMeters: PLACE_SYNC_RADIUS_METERS,
          categorySlug: category.slug as CategorySlug,
          ...(lookupQuery ? { query: lookupQuery } : {}),
          ...(options?.targetTotal !== undefined
            ? { targetTotal: options.targetTotal }
            : {}),
        }),
      })),
    )

    const persistedByProviderId = await this.persistReferences(
      results.flatMap(({ category, result }) =>
        result.places.map((place) => ({ category, place })),
      ),
      lookupQuery,
    )
    const placesById = new Map<string, ResolvedPlace>()

    for (const { result } of results) {
      for (const livePlace of result.places) {
        const reference = persistedByProviderId.get(livePlace.providerPlaceId)
        if (!reference || placesById.has(reference.id)) continue
        placesById.set(
          reference.id,
          this.toResolved(reference, livePlace, center),
        )
      }
    }

    return {
      places: [...placesById.values()].sort(
        (left, right) =>
          left.distanceMeters - right.distanceMeters ||
          left.name.localeCompare(right.name, 'ko'),
      ),
      isComplete: results.every(({ result }) => result.isComplete),
      unsupportedCategorySlugs,
    }
  }

  async resolvePlace(
    place: Place,
    center: PlaceSearchCenter,
  ): Promise<ResolvedPlace> {
    const resolved = await this.resolvePlaces([place], center)
    const result = resolved.get(place.id)
    if (!result) {
      throw new PlaceException(PlaceErrorCode.providerPlaceUnavailable)
    }
    return result
  }

  async resolvePlaces(
    places: Place[],
    center: PlaceSearchCenter,
    options?: { allowPartial?: boolean },
  ): Promise<Map<string, ResolvedPlace>> {
    const resolved = new Map<string, ResolvedPlace>()
    const kakaoByCategoryAndQuery = new Map<
      CategorySlug,
      Map<string, Place[]>
    >()

    for (const place of places) {
      if (place.source !== PlaceSource.Kakao) {
        resolved.set(place.id, this.toResolved(place, null, center))
        continue
      }
      const categorySlug = place.category.slug as CategorySlug
      const byQuery = kakaoByCategoryAndQuery.get(categorySlug) ?? new Map()
      const lookupQuery = place.lookupQuery?.trim() ?? ''
      const queryPlaces = byQuery.get(lookupQuery) ?? []
      queryPlaces.push(place)
      byQuery.set(lookupQuery, queryPlaces)
      kakaoByCategoryAndQuery.set(categorySlug, byQuery)
    }

    await Promise.all(
      [...kakaoByCategoryAndQuery].flatMap(([categorySlug, byQuery]) =>
        [...byQuery].map(async ([lookupQuery, references]) => {
          if (!this.kakaoPlacesProvider.supportsCategory(categorySlug)) {
            throw new PlaceException(PlaceErrorCode.providerPlaceUnavailable)
          }
          const result = await this.kakaoPlacesProvider.searchNearby({
            ...center,
            radiusMeters: PLACE_SYNC_RADIUS_METERS,
            categorySlug,
            ...(lookupQuery ? { query: lookupQuery } : {}),
          })
          this.addResolvedPlaces(resolved, references, result.places, center)
        }),
      ),
    )

    const fallbackByCategory = new Map<CategorySlug, Place[]>()
    for (const place of places) {
      if (
        place.source !== PlaceSource.Kakao ||
        resolved.has(place.id) ||
        !place.lookupQuery?.trim()
      ) {
        continue
      }
      const categorySlug = place.category.slug as CategorySlug
      const categoryPlaces = fallbackByCategory.get(categorySlug) ?? []
      categoryPlaces.push(place)
      fallbackByCategory.set(categorySlug, categoryPlaces)
    }

    await Promise.all(
      [...fallbackByCategory].map(async ([categorySlug, references]) => {
        const result = await this.kakaoPlacesProvider.searchNearby({
          ...center,
          radiusMeters: PLACE_SYNC_RADIUS_METERS,
          categorySlug,
        })
        this.addResolvedPlaces(resolved, references, result.places, center)
      }),
    )

    if (!options?.allowPartial && resolved.size !== places.length) {
      throw new PlaceException(PlaceErrorCode.providerPlaceUnavailable)
    }
    return resolved
  }

  private async persistReferences(
    candidates: Array<{ category: Category; place: PlaceProviderPlace }>,
    lookupQuery?: string,
  ): Promise<Map<string, Place>> {
    const unique = new Map<
      string,
      { category: Category; place: PlaceProviderPlace }
    >()
    for (const candidate of candidates) {
      if (!unique.has(candidate.place.providerPlaceId)) {
        unique.set(candidate.place.providerPlaceId, candidate)
      }
    }
    if (unique.size === 0) return new Map()

    const referencesToPersist = [...unique.values()].map(
      ({ category, place }) => {
        const reference = {
          category,
          // Kakao 정책상 장소 ID와 place_url만 보관한다. 아래 값은 스키마의
          // NOT NULL 제약을 만족하기 위한 비표시용 reference 값이다.
          // lookupQuery는 Kakao 응답이 아니라 사용자가 입력한 검색어다.
          name: place.providerPlaceId,
          address: KAKAO_REFERENCE_ADDRESS,
          latitude: 0,
          longitude: 0,
          location: KAKAO_REFERENCE_LOCATION,
          source: PlaceSource.Kakao,
          providerPlaceId: place.providerPlaceId,
          placeUrl: place.placeUrl,
          phone: null,
          roadAddress: null,
          providerCategoryCode: null,
          lastSyncedAt: null,
          previewUrl: null,
        }
        return lookupQuery ? { ...reference, lookupQuery } : reference
      },
    )
    await this.placeRepository.upsert(referencesToPersist, {
      conflictPaths: ['source', 'providerPlaceId'],
      skipUpdateIfNoValuesChanged: true,
    })

    const references = await this.placeRepository.find({
      where: {
        source: PlaceSource.Kakao,
        providerPlaceId: In([...unique.keys()]),
      },
      relations: { category: true },
    })
    return new Map(
      references
        .filter((reference) => reference.providerPlaceId !== null)
        .map((reference) => [reference.providerPlaceId as string, reference]),
    )
  }

  private addResolvedPlaces(
    resolved: Map<string, ResolvedPlace>,
    references: Place[],
    livePlaces: PlaceProviderPlace[],
    center: PlaceSearchCenter,
  ): void {
    const liveByProviderId = new Map(
      livePlaces.map((place) => [place.providerPlaceId, place]),
    )
    for (const reference of references) {
      const providerPlaceId = reference.providerPlaceId
      const livePlace = providerPlaceId
        ? liveByProviderId.get(providerPlaceId)
        : undefined
      if (livePlace) {
        resolved.set(
          reference.id,
          this.toResolved(reference, livePlace, center),
        )
      }
    }
  }

  private toResolved(
    reference: Place,
    livePlace: PlaceProviderPlace | null,
    center: PlaceSearchCenter,
  ): ResolvedPlace {
    const latitude = livePlace?.latitude ?? reference.latitude
    const longitude = livePlace?.longitude ?? reference.longitude
    return {
      id: reference.id,
      source: reference.source,
      providerPlaceId: reference.providerPlaceId,
      category: reference.category,
      name: livePlace?.name ?? reference.name,
      address: livePlace?.address ?? reference.address,
      roadAddress: livePlace?.roadAddress ?? reference.roadAddress,
      latitude,
      longitude,
      phone: livePlace?.phone ?? reference.phone,
      placeUrl: livePlace?.placeUrl ?? reference.placeUrl,
      previewUrl: reference.previewUrl,
      distanceMeters: haversineDistanceMeters(
        center.latitude,
        center.longitude,
        latitude,
        longitude,
      ),
    }
  }
}
