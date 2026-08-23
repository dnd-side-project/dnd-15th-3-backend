import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { Env } from 'src/config/env'
import { z } from 'zod'
import { PlaceSource } from '../enums/place-source.enum'
import { PlaceException } from '../exception/place.exception'
import { PlaceErrorCode } from '../exception/place-error-code'
import { GOOGLE_PLACE_TYPES_BY_CATEGORY } from './place-category-mapping'
import type {
  PlaceProvider,
  PlaceProviderPlace,
  PlaceProviderSearchRequest,
  PlaceProviderSearchResult,
} from './place-provider'

const GOOGLE_NEARBY_SEARCH_URL =
  'https://places.googleapis.com/v1/places:searchNearby'
const GOOGLE_REQUEST_TIMEOUT_MS = 10_000

const googlePlaceSchema = z.object({
  id: z.string().min(1),
  displayName: z.object({ text: z.string().min(1) }),
  formattedAddress: z.string().trim().min(1).nullish(),
  location: z.object({
    latitude: z.number().finite(),
    longitude: z.number().finite(),
  }),
  nationalPhoneNumber: z.string().trim().min(1).nullish(),
  googleMapsUri: z.string().url().nullish(),
  primaryType: z.string().trim().min(1).nullish(),
  types: z.array(z.string().min(1)).nullish(),
})

const googleNearbySearchResponseSchema = z.object({
  places: z.array(googlePlaceSchema).default([]),
})

@Injectable()
export class GooglePlacesProvider implements PlaceProvider {
  readonly source = PlaceSource.Google

  constructor(private readonly config: ConfigService<Env, true>) {}

  supportsCategory(categorySlug: CategorySlug): boolean {
    return GOOGLE_PLACE_TYPES_BY_CATEGORY[categorySlug].length > 0
  }

  async searchNearby(
    request: PlaceProviderSearchRequest,
  ): Promise<PlaceProviderSearchResult> {
    const apiKey = this.config
      .get('GOOGLE_PLACES_API_KEY', { infer: true })
      .trim()

    if (!apiKey) {
      throw new PlaceException(PlaceErrorCode.providerUnavailable)
    }

    const providerTypes = GOOGLE_PLACE_TYPES_BY_CATEGORY[request.categorySlug]

    const body = {
      includedTypes: providerTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: {
            latitude: request.latitude,
            longitude: request.longitude,
          },
          radius: request.radiusMeters,
        },
      },
    }

    let response: Response
    try {
      response = await fetch(GOOGLE_NEARBY_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.location',
            'places.nationalPhoneNumber',
            'places.googleMapsUri',
            'places.primaryType',
            'places.types',
          ].join(','),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
      })
    } catch {
      throw new PlaceException(PlaceErrorCode.providerRequestFailed)
    }

    if (!response.ok) {
      throw new PlaceException(PlaceErrorCode.providerRequestFailed)
    }

    let bodyJson: unknown
    try {
      bodyJson = await response.json()
    } catch {
      throw new PlaceException(PlaceErrorCode.invalidProviderResponse)
    }

    const parsedResponse = googleNearbySearchResponseSchema.safeParse(bodyJson)
    if (!parsedResponse.success) {
      throw new PlaceException(PlaceErrorCode.invalidProviderResponse)
    }

    const places = parsedResponse.data.places.map((place) => ({
      providerPlaceId: place.id,
      name: place.displayName.text,
      address: place.formattedAddress ?? place.displayName.text,
      roadAddress: place.formattedAddress ?? null,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      phone: place.nationalPhoneNumber ?? null,
      placeUrl: place.googleMapsUri ?? null,
      providerCategoryCode: place.primaryType ?? place.types?.[0] ?? null,
    }))

    return { places, isComplete: places.length < 20 }
  }
}
