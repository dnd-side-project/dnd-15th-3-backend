import { randomUUID } from 'node:crypto'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import {
  DataSource,
  type EntityManager,
  type Point,
  type Repository,
} from 'typeorm'
import { Place } from '../entities/place.entity'
import { PlaceSyncCoverage } from '../entities/place-sync-coverage.entity'
import { PlaceSyncJob } from '../entities/place-sync-job.entity'
import { PlaceSyncJobStatus } from '../enums/place-sync-job-status.enum'
import type { PlaceProvider } from '../provider/place-provider'
import { normalizeQueryRows } from './normalize-query-rows'
import {
  buildCoverageTiles,
  haversineDistanceMeters,
  PLACE_SYNC_COVERAGE_TTL_MS,
  PLACE_SYNC_MAX_ATTEMPTS,
  PLACE_SYNC_RADIUS_METERS,
  PLACE_SYNC_RETRY_DELAYS_SECONDS,
  PLACE_SYNC_TILE_LEASE_TTL_MS,
  PLACE_SYNC_TILE_QUERY_RADIUS_METERS,
} from './place-sync.constants'
import { PLACE_PROVIDER } from './place-sync.tokens'

export type PlaceCollectionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'READY'
  | 'PARTIAL'
  | 'FAILED'

class IncompletePlaceSyncCoverageError extends Error {}
class PlaceSyncTileLeaseUnavailableError extends Error {}

@Injectable()
export class PlaceSyncService {
  private readonly logger = new Logger(PlaceSyncService.name)

  constructor(
    @InjectRepository(PlaceSyncJob)
    private readonly jobRepository: Repository<PlaceSyncJob>,
    @InjectRepository(PlaceSyncCoverage)
    private readonly coverageRepository: Repository<PlaceSyncCoverage>,
    @InjectRepository(Place)
    private readonly placeEntityRepository: Repository<Place>,
    private readonly dataSource: DataSource,
    @Inject(PLACE_PROVIDER)
    private readonly provider: PlaceProvider,
  ) {}

  async createJobs(
    manager: EntityManager,
    meeting: Meeting,
    location: MeetingLocation,
    categories: Category[],
  ): Promise<void> {
    const repository = manager.getRepository(PlaceSyncJob)
    const center: Point = {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
    }

    await repository.insert(
      categories.map((category) => ({
        meeting,
        category,
        source: this.provider.source,
        locationVersion: location.syncVersion,
        center,
        radiusMeters: PLACE_SYNC_RADIUS_METERS,
        status: PlaceSyncJobStatus.Pending,
        attemptCount: 0,
        errorMessage: null,
        resultCount: 0,
        startedAt: null,
        completedAt: null,
      })),
    )
  }

  async getStatus(
    meetingId: string,
    locationVersion: number,
  ): Promise<{ status: PlaceCollectionStatus; lastSyncedAt: Date | null }> {
    const jobs = await this.jobRepository.find({
      where: {
        meeting: { id: meetingId },
        locationVersion,
      },
      order: { createdAt: 'ASC' },
    })

    if (jobs.length === 0) {
      return { status: 'PENDING', lastSyncedAt: null }
    }

    const statuses = new Set(jobs.map((job) => job.status))
    const lastSyncedAt = jobs.reduce<Date | null>((latest, job) => {
      if (job.status !== PlaceSyncJobStatus.Completed || !job.completedAt) {
        return latest
      }
      return !latest || job.completedAt > latest ? job.completedAt : latest
    }, null)

    if (statuses.has(PlaceSyncJobStatus.Running)) {
      return { status: 'RUNNING', lastSyncedAt }
    }
    if (statuses.has(PlaceSyncJobStatus.Pending)) {
      return { status: 'PENDING', lastSyncedAt }
    }
    if (statuses.size === 1 && statuses.has(PlaceSyncJobStatus.Completed)) {
      return { status: 'READY', lastSyncedAt }
    }
    if (statuses.has(PlaceSyncJobStatus.Completed)) {
      return { status: 'PARTIAL', lastSyncedAt }
    }
    if (statuses.has(PlaceSyncJobStatus.Failed)) {
      return { status: 'FAILED', lastSyncedAt }
    }

    return { status: 'PENDING', lastSyncedAt }
  }

  async processJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: { category: true },
    })

    if (!job) return

    try {
      const latitude = job.center.coordinates[1]
      const longitude = job.center.coordinates[0]
      const categorySlug = job.category.slug as CategorySlug

      if (!this.provider.supportsCategory(categorySlug)) {
        await this.completeJob(job.id, job.resultCount)
        return
      }

      const tiles = buildCoverageTiles(latitude, longitude, job.radiusMeters)
      let resultCount = job.resultCount
      const seenProviderPlaceIds = new Set<string>()
      const freshnessCutoff = new Date(Date.now() - PLACE_SYNC_COVERAGE_TTL_MS)

      for (const tile of tiles) {
        const alreadyCovered = await this.coverageRepository.findOne({
          where: {
            source: job.source,
            category: { id: job.category.id },
            tileKey: tile.key,
          },
        })
        if (
          alreadyCovered?.lastSyncedAt &&
          alreadyCovered.lastSyncedAt >= freshnessCutoff
        ) {
          continue
        }

        const leaseOwnerToken = randomUUID()
        const hasLease = await this.acquireTileLease(
          job.source,
          job.category.id,
          tile.key,
          leaseOwnerToken,
        )
        if (!hasLease) throw new PlaceSyncTileLeaseUnavailableError()

        try {
          const places = await this.collectTilePlaces(tile, categorySlug)
          const filteredPlaces = places.filter((place) => {
            if (
              haversineDistanceMeters(
                latitude,
                longitude,
                place.latitude,
                place.longitude,
              ) > job.radiusMeters
            ) {
              return false
            }
            if (seenProviderPlaceIds.has(place.providerPlaceId)) return false
            seenProviderPlaceIds.add(place.providerPlaceId)
            return true
          })

          if (filteredPlaces.length > 0) {
            await this.placeEntityRepository.upsert(
              filteredPlaces.map((place) => ({
                name: place.name,
                address: place.address,
                roadAddress: place.roadAddress,
                latitude: place.latitude,
                longitude: place.longitude,
                location: {
                  type: 'Point',
                  coordinates: [place.longitude, place.latitude],
                },
                source: job.source,
                providerPlaceId: place.providerPlaceId,
                placeUrl: place.placeUrl,
                phone: place.phone,
                providerCategoryCode: place.providerCategoryCode,
                lastSyncedAt: new Date(),
                category: job.category,
              })),
              {
                conflictPaths: ['source', 'providerPlaceId'],
                skipUpdateIfNoValuesChanged: true,
              },
            )
            resultCount += filteredPlaces.length
          }
        } finally {
          await this.releaseTileLease(leaseOwnerToken)
        }

        const syncedAt = new Date()
        if (alreadyCovered) {
          alreadyCovered.coverage = tile.coverage
          alreadyCovered.lastSyncedAt = syncedAt
          await this.coverageRepository.save(alreadyCovered)
        } else {
          await this.coverageRepository.save(
            this.coverageRepository.create({
              category: job.category,
              source: job.source,
              tileKey: tile.key,
              coverage: tile.coverage,
              lastSyncedAt: syncedAt,
            }),
          )
        }
        await this.jobRepository.update(job.id, { resultCount })
      }

      await this.completeJob(job.id, resultCount)
    } catch (error) {
      await this.failOrRetryJob(job, error)
    }
  }

  private async completeJob(jobId: string, resultCount: number) {
    await this.jobRepository.update(jobId, {
      status: PlaceSyncJobStatus.Completed,
      resultCount,
      completedAt: new Date(),
      errorMessage: null,
    })
  }

  private async failOrRetryJob(job: PlaceSyncJob, error: unknown) {
    const attemptIndex = Math.max(0, job.attemptCount - 1)
    const message = error instanceof Error ? error.message : String(error)

    if (job.attemptCount < PLACE_SYNC_MAX_ATTEMPTS) {
      const delaySeconds =
        PLACE_SYNC_RETRY_DELAYS_SECONDS[attemptIndex] ??
        PLACE_SYNC_RETRY_DELAYS_SECONDS.at(-1)!
      await this.jobRepository.update(job.id, {
        status: PlaceSyncJobStatus.Pending,
        nextRunAt: new Date(Date.now() + delaySeconds * 1000),
        errorMessage: message,
      })
      return
    }

    this.logger.error(`Place sync job ${job.id} failed`, message)
    await this.jobRepository.update(job.id, {
      status: PlaceSyncJobStatus.Failed,
      completedAt: new Date(),
      errorMessage: message,
    })
  }

  private async collectTilePlaces(
    tile: ReturnType<typeof buildCoverageTiles>[number],
    categorySlug: CategorySlug,
  ) {
    const result = await this.provider.searchNearby({
      latitude: tile.latitude,
      longitude: tile.longitude,
      radiusMeters: PLACE_SYNC_TILE_QUERY_RADIUS_METERS,
      categorySlug,
    })
    if (result.isComplete) return result.places

    const coordinates = tile.coverage.coordinates[0]
    const minLongitude = coordinates[0][0]
    const minLatitude = coordinates[0][1]
    const maxLongitude = coordinates[2][0]
    const maxLatitude = coordinates[2][1]
    const subtiles = await Promise.all(
      [0.25, 0.75].flatMap((latitudeRatio) =>
        [0.25, 0.75].map((longitudeRatio) =>
          this.provider.searchNearby({
            latitude: minLatitude + (maxLatitude - minLatitude) * latitudeRatio,
            longitude:
              minLongitude + (maxLongitude - minLongitude) * longitudeRatio,
            radiusMeters: PLACE_SYNC_TILE_QUERY_RADIUS_METERS / 2,
            categorySlug,
          }),
        ),
      ),
    )
    if (subtiles.some((subtile) => !subtile.isComplete)) {
      throw new IncompletePlaceSyncCoverageError(
        `Place sync tile ${tile.key} remained capped after subdivision.`,
      )
    }
    return subtiles.flatMap((subtile) => subtile.places)
  }

  private async acquireTileLease(
    source: string,
    categoryId: string,
    tileKey: string,
    ownerToken: string,
  ): Promise<boolean> {
    const result = await this.dataSource.query(
      `INSERT INTO "place_sync_tile_lease" ("category_id", "source", "tile_key", "owner_token", "expires_at")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + ($5 * INTERVAL '1 millisecond'))
       ON CONFLICT ("source", "category_id", "tile_key") DO UPDATE
       SET "owner_token" = EXCLUDED."owner_token", "expires_at" = EXCLUDED."expires_at"
       WHERE "place_sync_tile_lease"."expires_at" <= CURRENT_TIMESTAMP
       RETURNING "id"`,
      [categoryId, source, tileKey, ownerToken, PLACE_SYNC_TILE_LEASE_TTL_MS],
    )
    return normalizeQueryRows<{ id: string }>(result).length > 0
  }

  private async releaseTileLease(ownerToken: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM "place_sync_tile_lease" WHERE "owner_token" = $1`,
      [ownerToken],
    )
  }
}
