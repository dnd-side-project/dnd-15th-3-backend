import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MetricsService } from 'src/common/observability/metrics.service'
import type { Env } from 'src/config/env'
import { z } from 'zod'
import type {
  GooglePhotoReference,
  GooglePlacePhotoCandidate,
  PlacePhotoTarget,
} from './place-photo.types'

const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1'
const GOOGLE_TEXT_SEARCH_URL = `${GOOGLE_PLACES_BASE_URL}/places:searchText`
const GOOGLE_REQUEST_TIMEOUT_MS = 4_000
const GOOGLE_TEXT_SEARCH_PAGE_SIZE = 5
const GOOGLE_LOCATION_BIAS_RADIUS_METERS = 150

const googleAttributionSchema = z.object({
  displayName: z.string().trim().min(1),
  uri: z.string().trim().min(1).nullish(),
  photoUri: z.string().trim().min(1).nullish(),
})

const googlePhotoSchema = z.object({
  name: z.string().trim().min(1),
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
  authorAttributions: z.array(googleAttributionSchema).default([]),
})

const googlePhotoPlaceSchema = z.object({
  id: z.string().trim().min(1),
  displayName: z.object({ text: z.string().trim().min(1) }),
  formattedAddress: z.string().trim().min(1).default(''),
  location: z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  }),
  nationalPhoneNumber: z.string().trim().min(1).nullish(),
  photos: z.array(googlePhotoSchema).default([]),
})

const googleTextSearchResponseSchema = z.object({
  places: z.array(googlePhotoPlaceSchema).default([]),
})

const googlePlacePhotoResponseSchema = z.object({
  id: z.string().trim().min(1).optional(),
  photos: z.array(googlePhotoSchema).default([]),
})

const googlePhotoMediaResponseSchema = z.object({
  photoUri: z.string().url(),
})

export class GooglePlacePhotoProviderError extends Error {}

@Injectable()
export class GooglePlacePhotoProvider {
  constructor(
    private readonly config: ConfigService<Env, true>,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  isConfigured(): boolean {
    return this.apiKey().length > 0
  }

  searchCandidates(
    target: PlacePhotoTarget,
  ): Promise<GooglePlacePhotoCandidate[]> {
    return this.observe('search_photo_candidates', () =>
      this.requestCandidates(target),
    )
  }

  getPhotoReferences(providerPlaceId: string): Promise<GooglePhotoReference[]> {
    return this.observe('get_photo_references', () =>
      this.requestPhotoReferences(providerPlaceId),
    )
  }

  getPhotoUrl(photoName: string, maxWidthPx: number): Promise<string | null> {
    return this.observe('get_photo_media', () =>
      this.requestPhotoUrl(photoName, maxWidthPx),
    )
  }

  private async requestCandidates(
    target: PlacePhotoTarget,
  ): Promise<GooglePlacePhotoCandidate[]> {
    const response = await this.request(GOOGLE_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.nationalPhoneNumber',
          'places.photos',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: `${target.name} ${target.roadAddress ?? target.address}`,
        pageSize: GOOGLE_TEXT_SEARCH_PAGE_SIZE,
        languageCode: 'ko',
        regionCode: 'KR',
        locationBias: {
          circle: {
            center: {
              latitude: target.latitude,
              longitude: target.longitude,
            },
            radius: GOOGLE_LOCATION_BIAS_RADIUS_METERS,
          },
        },
      }),
    })
    const parsed = googleTextSearchResponseSchema.safeParse(response)
    if (!parsed.success) {
      throw new GooglePlacePhotoProviderError(
        'Google place photo candidate response is invalid',
      )
    }
    return parsed.data.places.map((place) => ({
      id: place.id,
      name: place.displayName.text,
      address: place.formattedAddress,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      phone: place.nationalPhoneNumber ?? null,
      photos: place.photos.map((photo) => this.toPhotoReference(photo)),
    }))
  }

  private async requestPhotoReferences(
    providerPlaceId: string,
  ): Promise<GooglePhotoReference[]> {
    const placeId = this.normalizePlaceId(providerPlaceId)
    if (!placeId) return []

    const response = await this.request(
      `${GOOGLE_PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}`,
      {
        headers: { 'X-Goog-FieldMask': 'id,photos' },
      },
    )
    const parsed = googlePlacePhotoResponseSchema.safeParse(response)
    if (!parsed.success) {
      throw new GooglePlacePhotoProviderError(
        'Google place photo reference response is invalid',
      )
    }
    return parsed.data.photos.map((photo) => this.toPhotoReference(photo))
  }

  private async requestPhotoUrl(
    photoName: string,
    maxWidthPx: number,
  ): Promise<string | null> {
    const normalizedName = photoName.replace(/^\/+|\/+$/g, '')
    if (
      !normalizedName.startsWith('places/') ||
      !normalizedName.includes('/photos/')
    ) {
      return null
    }
    const url = new URL(`${GOOGLE_PLACES_BASE_URL}/${normalizedName}/media`)
    url.search = new URLSearchParams({
      maxWidthPx: String(maxWidthPx),
      skipHttpRedirect: 'true',
    }).toString()
    const response = await this.request(url, {})
    const parsed = googlePhotoMediaResponseSchema.safeParse(response)
    return parsed.success && new URL(parsed.data.photoUri).protocol === 'https:'
      ? parsed.data.photoUri
      : null
  }

  private async request(
    input: string | URL,
    init: RequestInit,
  ): Promise<unknown> {
    const apiKey = this.apiKey()
    if (!apiKey) {
      throw new GooglePlacePhotoProviderError(
        'Google Places API key is not configured',
      )
    }

    const headers = new Headers(init.headers)
    headers.set('X-Goog-Api-Key', apiKey)

    let response: Response
    try {
      response = await fetch(input, {
        ...init,
        headers,
        signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new GooglePlacePhotoProviderError(
        'Google place photo request failed',
        { cause: error },
      )
    }
    if (!response.ok) {
      throw new GooglePlacePhotoProviderError(
        `Google place photo request returned ${response.status}`,
      )
    }
    try {
      return await response.json()
    } catch (error) {
      throw new GooglePlacePhotoProviderError(
        'Google place photo response is not JSON',
        { cause: error },
      )
    }
  }

  private toPhotoReference(
    photo: z.infer<typeof googlePhotoSchema>,
  ): GooglePhotoReference {
    return {
      name: photo.name,
      width: photo.widthPx,
      height: photo.heightPx,
      authorAttributions: photo.authorAttributions.map((attribution) => ({
        displayName: attribution.displayName,
        uri: this.normalizeOptionalUrl(attribution.uri),
        photoUri: this.normalizeOptionalUrl(attribution.photoUri),
      })),
    }
  }

  private normalizeOptionalUrl(
    value: string | null | undefined,
  ): string | null {
    if (!value) return null
    const normalized = value.startsWith('//') ? `https:${value}` : value
    try {
      const url = new URL(normalized)
      return url.protocol === 'https:' ? url.toString() : null
    } catch {
      return null
    }
  }

  private normalizePlaceId(value: string): string {
    return value.trim().replace(/^places\//, '')
  }

  private apiKey(): string {
    return this.config.get('GOOGLE_PLACES_API_KEY', { infer: true }).trim()
  }

  private observe<T>(operation: string, task: () => Promise<T>): Promise<T> {
    return this.metrics
      ? this.metrics.observeExternal('google_places', operation, task)
      : task()
  }
}
