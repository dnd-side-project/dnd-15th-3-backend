import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import { z } from 'zod'
import { PlaceSource } from '../enums/place-source.enum'
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

  async searchNearby(
    request: PlaceProviderSearchRequest,
  ): Promise<PlaceProviderSearchResult> {
    const apiKey = this.config
      .get('GOOGLE_PLACES_API_KEY', { infer: true })
      .trim()

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Google Places API 키가 설정되지 않았습니다.',
      )
    }

    const body = {
      includedTypes: request.providerTypes,
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
      throw new BadGatewayException(
        'Google Places Nearby Search API를 호출하지 못했습니다.',
      )
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `Google Places Nearby Search API가 ${response.status} 상태를 반환했습니다.`,
      )
    }

    let bodyJson: unknown
    try {
      bodyJson = await response.json()
    } catch {
      throw new BadGatewayException(
        'Google Places Nearby Search API 응답을 읽을 수 없습니다.',
      )
    }

    const parsedResponse = googleNearbySearchResponseSchema.safeParse(bodyJson)
    if (!parsedResponse.success) {
      throw new BadGatewayException(
        'Google Places Nearby Search API 응답 형식이 올바르지 않습니다.',
      )
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
