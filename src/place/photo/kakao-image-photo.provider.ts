import { Injectable, type OnModuleDestroy, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type RedisClientType } from 'redis'
import { MetricsService } from 'src/common/observability/metrics.service'
import type { Env } from 'src/config/env'
import { z } from 'zod'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import type { PlacePhoto, PlacePhotoTarget } from './place-photo.types'

const KAKAO_IMAGE_SEARCH_URL = 'https://dapi.kakao.com/v2/search/image'
const KAKAO_REQUEST_TIMEOUT_MS = 4_000
const KAKAO_IMAGE_CACHE_TTL_SECONDS = 24 * 60 * 60
const REDIS_CONNECT_TIMEOUT_MS = 500
const KAKAO_IMAGE_CACHE_KEY_PREFIX = 'momo:kakao-image:v1'

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
export class KakaoImagePhotoProvider implements OnModuleDestroy {
  private readonly inFlight = new Map<string, Promise<PlacePhoto[]>>()
  private readonly cacheClient: RedisClientType | null
  private cacheConnection: Promise<boolean> | undefined

  constructor(
    private readonly config: ConfigService<Env, true>,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    const redisUrl = this.config.get('REDIS_URL', { infer: true })
    this.cacheClient = redisUrl
      ? createClient({
          url: redisUrl,
          socket: {
            connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
            reconnectStrategy: false,
          },
        })
      : null
    this.cacheClient?.on('error', () => undefined)
  }

  onModuleDestroy(): void {
    if (this.cacheClient?.isOpen) this.cacheClient.destroy()
  }

  isConfigured(): boolean {
    return this.apiKey().length > 0
  }

  findPhotos(target: PlacePhotoTarget, limit: number): Promise<PlacePhoto[]> {
    const key = `${target.id}:${limit}`
    const pending = this.inFlight.get(key)
    if (pending) return pending

    const request = this.loadPhotos(target, limit).finally(() => {
      if (this.inFlight.get(key) === request) this.inFlight.delete(key)
    })
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
    const cacheKey = `${KAKAO_IMAGE_CACHE_KEY_PREFIX}:${url.searchParams.toString()}`
    const cached = await this.readCache(cacheKey)
    if (cached) return this.toPhotos(target, cached.documents, limit)

    let response: Response
    try {
      response = await this.observe(() =>
        fetch(url, {
          headers: { authorization: `KakaoAK ${apiKey}` },
          signal: AbortSignal.timeout(KAKAO_REQUEST_TIMEOUT_MS),
        }),
      )
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

    await this.writeCache(cacheKey, parsed.data)
    return this.toPhotos(target, parsed.data.documents, limit)
  }

  private toPhotos(
    target: PlacePhotoTarget,
    documents: z.infer<typeof kakaoImageDocumentSchema>[],
    limit: number,
  ): PlacePhoto[] {
    const seen = new Set<string>()
    return documents
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

  private async readCache(
    key: string,
  ): Promise<z.infer<typeof kakaoImageResponseSchema> | null> {
    if (!(await this.ensureCacheReady())) return null
    try {
      const value = await this.cacheClient?.get(key)
      if (!value) return null
      const parsed = kakaoImageResponseSchema.safeParse(JSON.parse(value))
      return parsed.success ? parsed.data : null
    } catch {
      return null
    }
  }

  private async writeCache(
    key: string,
    value: z.infer<typeof kakaoImageResponseSchema>,
  ): Promise<void> {
    if (!(await this.ensureCacheReady())) return
    try {
      await this.cacheClient?.set(key, JSON.stringify(value), {
        expiration: { type: 'EX', value: KAKAO_IMAGE_CACHE_TTL_SECONDS },
      })
    } catch {
      // 캐시는 선택 기능이므로 Kakao 응답을 그대로 반환한다.
    }
  }

  private async ensureCacheReady(): Promise<boolean> {
    if (!this.cacheClient) return false
    if (this.cacheClient.isReady) return true
    if (this.cacheConnection) return await this.cacheConnection
    if (this.cacheClient.isOpen) return false

    this.cacheConnection = this.cacheClient.connect().then(
      () => true,
      () => false,
    )
    const connected = await this.cacheConnection
    this.cacheConnection = undefined
    return connected
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
