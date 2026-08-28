import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MetricsService } from 'src/common/observability/metrics.service'
import type { Env } from 'src/config/env'
import { z } from 'zod'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import type { PlacePhoto, PlacePhotoTarget } from './place-photo.types'
import { selectPlacePhotoMatch } from './place-photo-matcher'

const TOUR_API_BASE_URL = 'https://apis.data.go.kr/B551011/KorService2'
const TOUR_API_SOURCE_URL = 'https://www.data.go.kr/data/15101578/openapi.do'
const TOUR_REQUEST_TIMEOUT_MS = 4_000
const TOUR_SEARCH_ROWS = 20

const tourSearchItemSchema = z.object({
  contentid: z.string().trim().min(1),
  title: z.string().trim().min(1),
  addr1: z.string().trim().default(''),
  mapx: z.coerce.number().finite().min(-180).max(180),
  mapy: z.coerce.number().finite().min(-90).max(90),
  firstimage: z.string().trim().default(''),
  firstimage2: z.string().trim().default(''),
  cpyrhtDivCd: z.string().trim().default(''),
})

const tourDetailImageSchema = z.object({
  originimgurl: z.string().trim().default(''),
  smallimageurl: z.string().trim().default(''),
  cpyrhtDivCd: z.string().trim().default(''),
})

const tourItemsSchema = <T extends z.ZodType>(itemSchema: T) =>
  z
    .union([z.object({ item: z.array(itemSchema) }), z.literal(''), z.null()])
    .optional()

const tourSearchResponseSchema = z.object({
  response: z.object({
    header: z.object({ resultCode: z.string() }),
    body: z.object({ items: tourItemsSchema(tourSearchItemSchema) }),
  }),
})

const tourDetailImageResponseSchema = z.object({
  response: z.object({
    header: z.object({ resultCode: z.string() }),
    body: z.object({ items: tourItemsSchema(tourDetailImageSchema) }),
  }),
})

type TourSearchItem = z.infer<typeof tourSearchItemSchema>

export class TourPlacePhotoProviderError extends Error {}

@Injectable()
export class TourPlacePhotoProvider {
  private readonly inFlight = new Map<string, Promise<PlacePhoto[]>>()

  constructor(
    private readonly config: ConfigService<Env, true>,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  isConfigured(): boolean {
    return this.serviceKey().length > 0
  }

  findPhotos(target: PlacePhotoTarget, limit: number): Promise<PlacePhoto[]> {
    const key = `${target.id}:${limit}`
    const pending = this.inFlight.get(key)
    if (pending) return pending

    const request = this.observe(() => this.loadPhotos(target, limit)).finally(
      () => {
        if (this.inFlight.get(key) === request) this.inFlight.delete(key)
      },
    )
    this.inFlight.set(key, request)
    return request
  }

  private async loadPhotos(
    target: PlacePhotoTarget,
    limit: number,
  ): Promise<PlacePhoto[]> {
    const matched = await this.findMatchedPlace(target)
    if (!matched) return []

    const images = [
      {
        url: matched.firstimage || matched.firstimage2,
        copyright: matched.cpyrhtDivCd,
      },
    ]
    if (limit > 1) {
      try {
        images.push(...(await this.findDetailImages(matched.contentid)))
      } catch {
        // 대표 이미지가 있으면 상세 이미지 장애에도 그대로 사용한다.
      }
    }

    const seen = new Set<string>()
    return images
      .map((image) => ({ ...image, url: this.httpsUrl(image.url) }))
      .filter((image): image is { url: string; copyright: string } => {
        if (image.url === null || seen.has(image.url)) return false
        seen.add(image.url)
        return true
      })
      .slice(0, limit)
      .map((image, index) => ({
        id: `tour:${target.id}:${index + 1}`,
        url: image.url,
        width: null,
        height: null,
        source: PlacePhotoSource.Tour,
        attributions: [
          {
            displayName: this.attributionName(image.copyright),
            uri: TOUR_API_SOURCE_URL,
            photoUri: null,
          },
        ],
        googleMapsUri: null,
        flagContentUri: null,
      }))
  }

  private async findMatchedPlace(
    target: PlacePhotoTarget,
  ): Promise<TourSearchItem | null> {
    const response = await this.request('searchKeyword2', {
      arrange: 'A',
      keyword: target.name,
      numOfRows: String(TOUR_SEARCH_ROWS),
      pageNo: '1',
    })
    const parsed = tourSearchResponseSchema.safeParse(response)
    if (!parsed.success || parsed.data.response.header.resultCode !== '0000') {
      throw new TourPlacePhotoProviderError(
        'TourAPI place photo search response is invalid',
      )
    }
    const items = this.items(parsed.data.response.body.items)
    const selection = selectPlacePhotoMatch(
      target,
      items.map((item) => ({
        id: item.contentid,
        name: item.title,
        address: item.addr1,
        latitude: item.mapy,
        longitude: item.mapx,
        phone: null,
      })),
    )
    return selection.candidate
      ? (items.find((item) => item.contentid === selection.candidate?.id) ??
          null)
      : null
  }

  private async findDetailImages(
    contentId: string,
  ): Promise<Array<{ url: string; copyright: string }>> {
    const response = await this.request('detailImage2', {
      contentId,
      // biome-ignore lint/style/useNamingConvention: TourAPI request field.
      imageYN: 'Y',
      numOfRows: '10',
      pageNo: '1',
    })
    const parsed = tourDetailImageResponseSchema.safeParse(response)
    if (!parsed.success || parsed.data.response.header.resultCode !== '0000') {
      throw new TourPlacePhotoProviderError(
        'TourAPI detail image response is invalid',
      )
    }
    return this.items(parsed.data.response.body.items).map((image) => ({
      url: image.originimgurl || image.smallimageurl,
      copyright: image.cpyrhtDivCd,
    }))
  }

  private async request(
    operation: string,
    query: Record<string, string>,
  ): Promise<unknown> {
    const serviceKey = this.serviceKey()
    if (!serviceKey) {
      throw new TourPlacePhotoProviderError(
        'TourAPI service key is not configured',
      )
    }
    const url = new URL(`${TOUR_API_BASE_URL}/${operation}`)
    url.search = new URLSearchParams([
      ['serviceKey', serviceKey],
      ['MobileOS', 'ETC'],
      ['MobileApp', 'Momo'],
      ['_type', 'json'],
      ...Object.entries(query),
    ]).toString()

    let response: Response
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(TOUR_REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new TourPlacePhotoProviderError('TourAPI request failed', {
        cause: error,
      })
    }
    if (!response.ok) {
      throw new TourPlacePhotoProviderError(
        `TourAPI request returned ${response.status}`,
      )
    }
    try {
      return await response.json()
    } catch (error) {
      throw new TourPlacePhotoProviderError('TourAPI response is not JSON', {
        cause: error,
      })
    }
  }

  private items<T>(value: { item: T[] } | '' | null | undefined): T[] {
    return value && typeof value === 'object' ? value.item : []
  }

  private httpsUrl(value: string): string | null {
    if (!value) return null
    try {
      const url = new URL(value.startsWith('//') ? `https:${value}` : value)
      if (url.protocol === 'http:') url.protocol = 'https:'
      return url.protocol === 'https:' ? url.toString() : null
    } catch {
      return null
    }
  }

  private attributionName(copyright: string): string {
    if (copyright === 'Type1') return '한국관광공사 · 공공누리 제1유형'
    if (copyright === 'Type3') return '한국관광공사 · 공공누리 제3유형'
    return '한국관광공사 TourAPI'
  }

  private serviceKey(): string {
    const value = this.config
      .get('TOUR_API_SERVICE_KEY', { infer: true })
      .trim()
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  private observe<T>(task: () => Promise<T>): Promise<T> {
    return this.metrics
      ? this.metrics.observeExternal('tour_api', 'find_place_photos', task)
      : task()
  }
}
