import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MetricsService } from 'src/common/observability/metrics.service'
import type { Env } from 'src/config/env'
import { z } from 'zod'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import type { PlacePhoto, PlacePhotoTarget } from './place-photo.types'

const KAKAO_IMAGE_SEARCH_URL = 'https://dapi.kakao.com/v2/search/image'
const KAKAO_REQUEST_TIMEOUT_MS = 4_000

const kakaoImageDocumentSchema = z.object({
  // biome-ignore lint/style/useNamingConvention: Kakao API response field.
  image_url: z.string().trim().default(''),
  // biome-ignore lint/style/useNamingConvention: Kakao API response field.
  thumbnail_url: z.string().trim().default(''),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  // biome-ignore lint/style/useNamingConvention: Kakao API response field.
  display_sitename: z.string().trim().default(''),
  // biome-ignore lint/style/useNamingConvention: Kakao API response field.
  doc_url: z.string().trim().default(''),
})

const kakaoImageResponseSchema = z.object({
  documents: z.array(kakaoImageDocumentSchema).default([]),
})

export class KakaoImagePhotoProviderError extends Error {}

@Injectable()
export class KakaoImagePhotoProvider {
  private readonly inFlight = new Map<string, Promise<PlacePhoto[]>>()

  constructor(
    private readonly config: ConfigService<Env, true>,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  isConfigured(): boolean {
    return this.apiKey().length > 0
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
    const apiKey = this.apiKey()
    if (!apiKey) {
      throw new KakaoImagePhotoProviderError(
        'Kakao REST API key is not configured',
      )
    }
    const address = (target.roadAddress ?? target.address)
      .split(/\s+/)
      .slice(0, 2)
      .join(' ')
    const url = new URL(KAKAO_IMAGE_SEARCH_URL)
    url.search = new URLSearchParams({
      query: `${target.name} ${address}`.trim(),
      sort: 'accuracy',
      size: String(Math.min(80, Math.max(limit * 3, 10))),
    }).toString()

    let response: Response
    try {
      response = await fetch(url, {
        headers: { authorization: `KakaoAK ${apiKey}` },
        signal: AbortSignal.timeout(KAKAO_REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new KakaoImagePhotoProviderError(
        'Kakao image search request failed',
        { cause: error },
      )
    }
    if (!response.ok) {
      throw new KakaoImagePhotoProviderError(
        `Kakao image search returned ${response.status}`,
      )
    }

    let body: unknown
    try {
      body = await response.json()
    } catch (error) {
      throw new KakaoImagePhotoProviderError(
        'Kakao image search response is not JSON',
        { cause: error },
      )
    }
    const parsed = kakaoImageResponseSchema.safeParse(body)
    if (!parsed.success) {
      throw new KakaoImagePhotoProviderError(
        'Kakao image search response is invalid',
      )
    }

    const seen = new Set<string>()
    return parsed.data.documents
      .map((document) => ({
        document,
        imageUrl:
          this.httpsUrl(document.image_url) ??
          this.httpsUrl(document.thumbnail_url),
        documentUrl: this.webUrl(document.doc_url),
      }))
      .filter((item): item is typeof item & { imageUrl: string } => {
        if (item.imageUrl === null || seen.has(item.imageUrl)) return false
        seen.add(item.imageUrl)
        return true
      })
      .slice(0, limit)
      .map(({ document, imageUrl, documentUrl }, index) => ({
        id: `kakao-image:${target.id}:${index + 1}`,
        url: imageUrl,
        width: document.width > 0 ? document.width : null,
        height: document.height > 0 ? document.height : null,
        source: PlacePhotoSource.Kakao,
        attributions: [
          {
            displayName: document.display_sitename || 'Daum 이미지 검색',
            uri: documentUrl,
            photoUri: null,
          },
        ],
        googleMapsUri: null,
        flagContentUri: null,
      }))
  }

  private httpsUrl(value: string): string | null {
    const url = this.parseUrl(value)
    if (!url) return null
    if (url.protocol === 'http:') url.protocol = 'https:'
    return url.protocol === 'https:' ? url.toString() : null
  }

  private webUrl(value: string): string | null {
    const url = this.parseUrl(value)
    return url && (url.protocol === 'http:' || url.protocol === 'https:')
      ? url.toString()
      : null
  }

  private parseUrl(value: string): URL | null {
    if (!value) return null
    try {
      return new URL(value.startsWith('//') ? `https:${value}` : value)
    } catch {
      return null
    }
  }

  private apiKey(): string {
    return this.config.get('KAKAO_REST_API_KEY', { infer: true }).trim()
  }

  private observe<T>(task: () => Promise<T>): Promise<T> {
    return this.metrics
      ? this.metrics.observeExternal('kakao_image', 'search_images', task)
      : task()
  }
}
