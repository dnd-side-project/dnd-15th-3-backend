import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import type { Env } from 'src/config/env'
import { In, Repository } from 'typeorm'
import { Place } from '../entities/place.entity'
import { PlacePhotoMatch } from '../entities/place-photo-match.entity'
import { PlacePhotoMatchStatus } from '../enums/place-photo-match-status.enum'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'
import { PlaceSource } from '../enums/place-source.enum'
import { PlaceImageService } from '../place-image.service'
import { GooglePlacePhotoProvider } from './google-place-photo.provider'
import type {
  GooglePhotoReference,
  PlacePhoto,
  PlacePhotoTarget,
} from './place-photo.types'
import { selectGooglePlacePhotoMatch } from './place-photo-matcher'

const PREVIEW_MAX_WIDTH_PX = 400
const DETAIL_MAX_WIDTH_PX = 1600
const MAX_DETAIL_PHOTOS = 5
const MATCHED_TTL_MS = 30 * 24 * 60 * 60 * 1_000
const AMBIGUOUS_TTL_MS = 7 * 24 * 60 * 60 * 1_000
const NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1_000

type GoogleMatch = {
  providerPlaceId: string
  photos: GooglePhotoReference[] | null
}

@Injectable()
export class PlacePhotoService {
  private readonly inFlightMatches = new Map<
    string,
    Promise<GoogleMatch | null>
  >()
  private readonly inFlightGooglePhotos = new Map<
    string,
    Promise<PlacePhoto[]>
  >()

  constructor(
    @InjectRepository(PlacePhotoMatch)
    private readonly matchRepository: Repository<PlacePhotoMatch>,
    private readonly placeImageService: PlaceImageService,
    private readonly googlePhotoProvider: GooglePlacePhotoProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async findPreviewPhotos(
    targets: PlacePhotoTarget[],
  ): Promise<Map<string, PlacePhoto>> {
    if (targets.length === 0) return new Map()

    const uniqueTargets = [
      ...new Map(targets.map((target) => [target.id, target])).values(),
    ]
    const googleConfigured = this.googlePhotoProvider.isConfigured()

    const [ownedUrls, existingMatches] = await Promise.all([
      this.placeImageService.getPrimaryImageUrls(
        uniqueTargets.map((target) => target.id),
      ),
      googleConfigured
        ? this.findExistingGoogleMatches(uniqueTargets).catch(() => new Map())
        : Promise.resolve(new Map<string, PlacePhotoMatch>()),
    ])
    const result = new Map<string, PlacePhoto>()
    for (const target of uniqueTargets) {
      const url = ownedUrls.get(target.id)
      if (url) result.set(target.id, this.ownedPhoto(target.id, url, 0))
    }

    if (!googleConfigured) return result
    const unresolved = uniqueTargets.filter((target) => !result.has(target.id))
    await this.forEachConcurrent(
      unresolved,
      this.config.get('PLACE_PHOTO_PREVIEW_CONCURRENCY', { infer: true }),
      async (target) => {
        const photos = await this.findGooglePhotos(
          target,
          1,
          PREVIEW_MAX_WIDTH_PX,
          existingMatches.get(target.id) ?? null,
        )
        if (photos[0]) result.set(target.id, photos[0])
      },
    )
    return result
  }

  async findPhotos(target: PlacePhotoTarget): Promise<PlacePhoto[]> {
    const ownedUrls = await this.placeImageService.getImageUrls(target.id)
    if (ownedUrls.length > 0) {
      return ownedUrls.map((url, index) =>
        this.ownedPhoto(target.id, url, index),
      )
    }
    if (!this.googlePhotoProvider.isConfigured()) return []
    return await this.findGooglePhotos(
      target,
      MAX_DETAIL_PHOTOS,
      DETAIL_MAX_WIDTH_PX,
    )
  }

  private findGooglePhotos(
    target: PlacePhotoTarget,
    limit: number,
    maxWidthPx: number,
    existingMatch?: PlacePhotoMatch | null,
  ): Promise<PlacePhoto[]> {
    const key = `${target.id}:${limit}:${maxWidthPx}`
    const pending = this.inFlightGooglePhotos.get(key)
    if (pending) return pending

    const request = this.loadGooglePhotos(
      target,
      limit,
      maxWidthPx,
      existingMatch,
    ).finally(() => {
      if (this.inFlightGooglePhotos.get(key) === request) {
        this.inFlightGooglePhotos.delete(key)
      }
    })
    this.inFlightGooglePhotos.set(key, request)
    return request
  }

  private async loadGooglePhotos(
    target: PlacePhotoTarget,
    limit: number,
    maxWidthPx: number,
    existingMatch?: PlacePhotoMatch | null,
  ): Promise<PlacePhoto[]> {
    try {
      const match = await this.resolveGoogleMatch(target, existingMatch)
      if (!match) return []
      const references =
        match.photos ??
        (await this.googlePhotoProvider.getPhotoReferences(
          match.providerPlaceId,
        ))
      const displayableReferences = references.filter(
        (reference) => reference.googleMapsUri !== null,
      )
      const photos = await Promise.all(
        displayableReferences.slice(0, limit).map(async (reference, index) => {
          let url: string | null
          try {
            url = await this.googlePhotoProvider.getPhotoUrl(
              reference.name,
              maxWidthPx,
            )
          } catch {
            return null
          }
          if (!url) return null
          return {
            id: `google:${target.id}:${index + 1}`,
            url,
            width: reference.width,
            height: reference.height,
            source: PlacePhotoSource.Google,
            attributions: reference.authorAttributions,
            googleMapsUri: reference.googleMapsUri,
            flagContentUri: reference.flagContentUri,
          } satisfies PlacePhoto
        }),
      )
      return photos.filter((photo) => photo !== null)
    } catch {
      // 장소 본문은 사진 제공자의 장애와 무관하게 응답해야 한다.
      return []
    }
  }

  private resolveGoogleMatch(
    target: PlacePhotoTarget,
    existingMatch?: PlacePhotoMatch | null,
  ): Promise<GoogleMatch | null> {
    if (target.source === PlaceSource.Google && target.providerPlaceId) {
      return Promise.resolve({
        providerPlaceId: target.providerPlaceId,
        photos: null,
      })
    }
    if (target.source !== PlaceSource.Kakao) return Promise.resolve(null)

    const pending = this.inFlightMatches.get(target.id)
    if (pending) return pending

    const request = this.findOrCreateGoogleMatch(target, existingMatch).finally(
      () => {
        if (this.inFlightMatches.get(target.id) === request) {
          this.inFlightMatches.delete(target.id)
        }
      },
    )
    this.inFlightMatches.set(target.id, request)
    return request
  }

  private async findOrCreateGoogleMatch(
    target: PlacePhotoTarget,
    knownExisting?: PlacePhotoMatch | null,
  ): Promise<GoogleMatch | null> {
    const existing =
      knownExisting === undefined
        ? await this.matchRepository.findOne({
            where: {
              place: { id: target.id },
              provider: PlaceSource.Google,
            },
          })
        : knownExisting
    if (existing && existing.expiresAt > new Date()) {
      return existing.status === PlacePhotoMatchStatus.Matched &&
        existing.providerPlaceId
        ? { providerPlaceId: existing.providerPlaceId, photos: null }
        : null
    }

    const candidates = await this.googlePhotoProvider.searchCandidates(target)
    const selection = selectGooglePlacePhotoMatch(target, candidates)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.matchTtl(selection.status))
    const providerPlaceId = selection.candidate?.id ?? null
    const values = {
      place: { id: target.id } as Place,
      provider: PlaceSource.Google,
      providerPlaceId,
      status: selection.status,
      confidence: selection.confidence,
      checkedAt: now,
      expiresAt,
    }

    if (existing) {
      await this.matchRepository.save(Object.assign(existing, values))
    } else {
      await this.matchRepository.save(this.matchRepository.create(values))
    }

    return selection.candidate
      ? {
          providerPlaceId: selection.candidate.id,
          photos: selection.candidate.photos,
        }
      : null
  }

  private matchTtl(status: PlacePhotoMatchStatus): number {
    if (status === PlacePhotoMatchStatus.Matched) return MATCHED_TTL_MS
    if (status === PlacePhotoMatchStatus.Ambiguous) return AMBIGUOUS_TTL_MS
    return NOT_FOUND_TTL_MS
  }

  private async findExistingGoogleMatches(
    targets: PlacePhotoTarget[],
  ): Promise<Map<string, PlacePhotoMatch>> {
    const placeIds = targets
      .filter((target) => target.source === PlaceSource.Kakao)
      .map((target) => target.id)
    if (placeIds.length === 0) return new Map()

    const matches = await this.matchRepository.find({
      where: {
        place: { id: In(placeIds) },
        provider: PlaceSource.Google,
      },
      relations: { place: true },
    })
    return new Map(matches.map((match) => [match.place.id, match]))
  }

  private ownedPhoto(placeId: string, url: string, index: number): PlacePhoto {
    return {
      id: `owned:${placeId}:${index + 1}`,
      url,
      width: null,
      height: null,
      source: PlacePhotoSource.Owned,
      attributions: [],
      googleMapsUri: null,
      flagContentUri: null,
    }
  }

  private async forEachConcurrent<T>(
    values: T[],
    concurrency: number,
    task: (value: T) => Promise<void>,
  ): Promise<void> {
    let nextIndex = 0
    const worker = async () => {
      while (nextIndex < values.length) {
        const value = values[nextIndex]
        nextIndex += 1
        await task(value)
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, values.length) }, worker),
    )
  }
}
