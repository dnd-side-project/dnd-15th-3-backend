import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from 'src/config/env'
import {
  type KakaoImageSearchDocument,
  kakaoImageSearchResponseSchema,
} from './schema/image-search-response.schema'

const KAKAO_IMAGE_SEARCH_URL = 'https://dapi.kakao.com/v2/search/image'
const KAKAO_IMAGE_SEARCH_TIMEOUT_MS = 3_000
const KAKAO_IMAGE_SEARCH_SIZE = 5
const KAKAO_IMAGE_SEARCH_CONCURRENCY = 5
const IMAGE_CACHE_TTL_MS = 60 * 60 * 1_000
const EMPTY_CACHE_TTL_MS = 5 * 60 * 1_000
const FAILURE_COOLDOWN_MS = 30 * 1_000
const MAX_CACHE_ENTRIES = 2_000
const MAX_QUERY_LENGTH = 200

export type KakaoImageSearchTarget = {
  name: string
  address: string
  roadAddress: string | null
}

export type KakaoImagePreviewTarget = KakaoImageSearchTarget & {
  id: string
}

export type KakaoPlaceImage = {
  url: string
  thumbnailUrl: string
  sourceName: string | null
  sourceUrl: string | null
  width: number
  height: number
}

type CacheEntry = {
  images: KakaoPlaceImage[]
  expiresAt: number
}

@Injectable()
export class KakaoImageSearchService {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly inFlight = new Map<
    string,
    Promise<KakaoPlaceImage[] | null>
  >()
  private unavailableUntil = 0

  constructor(private readonly config: ConfigService<Env, true>) {}

  async findImages(target: KakaoImageSearchTarget): Promise<KakaoPlaceImage[]> {
    const query = this.buildQuery(target)
    if (!query) return []

    const cacheKey = query.toLocaleLowerCase('ko')
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      // Map의 삽입 순서를 갱신해 간단한 LRU로 사용한다.
      this.cache.delete(cacheKey)
      this.cache.set(cacheKey, cached)
      return cached.images
    }
    if (cached) this.cache.delete(cacheKey)
    if (this.unavailableUntil > Date.now()) return []

    const pending = this.inFlight.get(cacheKey)
    if (pending) return (await pending) ?? []

    const request = this.requestImages(query)
    this.inFlight.set(cacheKey, request)
    try {
      const images = await request
      if (images === null) {
        this.unavailableUntil = Date.now() + FAILURE_COOLDOWN_MS
        return []
      }
      this.setCache(cacheKey, images)
      return images
    } finally {
      if (this.inFlight.get(cacheKey) === request) {
        this.inFlight.delete(cacheKey)
      }
    }
  }

  async findPreviewImages(
    targets: KakaoImagePreviewTarget[],
  ): Promise<Map<string, KakaoPlaceImage>> {
    const previews = new Map<string, KakaoPlaceImage>()
    if (targets.length === 0) return previews

    let nextIndex = 0
    const worker = async () => {
      while (nextIndex < targets.length) {
        const target = targets[nextIndex]
        nextIndex += 1
        const image = (await this.findImages(target))[0]
        if (image) previews.set(target.id, image)
      }
    }
    const workerCount = Math.min(KAKAO_IMAGE_SEARCH_CONCURRENCY, targets.length)
    await Promise.all(Array.from({ length: workerCount }, worker))
    return previews
  }

  private async requestImages(
    query: string,
  ): Promise<KakaoPlaceImage[] | null> {
    const apiKey = this.config.get('KAKAO_REST_API_KEY', { infer: true }).trim()
    if (!apiKey) return null

    const url = new URL(KAKAO_IMAGE_SEARCH_URL)
    url.search = new URLSearchParams({
      query,
      sort: 'accuracy',
      page: '1',
      size: String(KAKAO_IMAGE_SEARCH_SIZE),
    }).toString()

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
          Authorization: `KakaoAK ${apiKey}`,
        },
        signal: AbortSignal.timeout(KAKAO_IMAGE_SEARCH_TIMEOUT_MS),
      })
    } catch {
      return null
    }
    if (!response.ok) return null

    let body: unknown
    try {
      body = await response.json()
    } catch {
      return null
    }
    const parsedResponse = kakaoImageSearchResponseSchema.safeParse(body)
    if (!parsedResponse.success) return null

    const images: KakaoPlaceImage[] = []
    const seenUrls = new Set<string>()
    for (const document of parsedResponse.data.documents) {
      const image = this.toPlaceImage(document)
      if (!image || seenUrls.has(image.url)) continue
      seenUrls.add(image.url)
      images.push(image)
    }
    return images
  }

  private toPlaceImage(
    document: KakaoImageSearchDocument,
  ): KakaoPlaceImage | null {
    const originalUrl = this.toUrl(document.image_url, true)
    const thumbnailUrl = this.toUrl(document.thumbnail_url, true)
    const renderUrl = originalUrl ?? thumbnailUrl
    if (!renderUrl) return null

    return {
      url: renderUrl,
      thumbnailUrl: thumbnailUrl ?? renderUrl,
      sourceName: document.display_sitename.trim() || null,
      sourceUrl: this.toUrl(document.doc_url, false),
      width: document.width,
      height: document.height,
    }
  }

  private toUrl(value: string, httpsOnly: boolean): string | null {
    try {
      const url = new URL(value)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
      if (httpsOnly && url.protocol !== 'https:') return null
      return url.toString()
    } catch {
      return null
    }
  }

  private buildQuery(target: KakaoImageSearchTarget): string {
    const name = target.name.trim().replace(/\s+/g, ' ')
    const address = (target.roadAddress ?? target.address)
      .trim()
      .replace(/\s+/g, ' ')
    return [...new Set([name, address].filter(Boolean))]
      .join(' ')
      .slice(0, MAX_QUERY_LENGTH)
  }

  private setCache(cacheKey: string, images: KakaoPlaceImage[]): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key)
    }
    while (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey === undefined) break
      this.cache.delete(oldestKey)
    }
    this.cache.set(cacheKey, {
      images,
      expiresAt:
        now + (images.length > 0 ? IMAGE_CACHE_TTL_MS : EMPTY_CACHE_TTL_MS),
    })
  }
}
