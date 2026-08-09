import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import type { EntityManager, Point, Repository } from 'typeorm'
import { Place } from '../entities/place.entity'
import { PlaceSyncCoverage } from '../entities/place-sync-coverage.entity'
import { PlaceSyncJob } from '../entities/place-sync-job.entity'
import { PlaceSyncJobStatus } from '../enums/place-sync-job-status.enum'
import { GOOGLE_PLACE_TYPES_BY_CATEGORY } from '../provider/place-category-mapping'
import type { PlaceProvider } from '../provider/place-provider'
import {
  buildCoverageTiles,
  haversineDistanceMeters,
  PLACE_SYNC_COVERAGE_TTL_MS,
  PLACE_SYNC_MAX_ATTEMPTS,
  PLACE_SYNC_RADIUS_METERS,
  PLACE_SYNC_RETRY_DELAYS_SECONDS,
  PLACE_SYNC_TILE_QUERY_RADIUS_METERS,
} from './place-sync.constants'
import { PLACE_PROVIDER } from './place-sync.tokens'

export type PlaceCollectionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'READY'
  | 'PARTIAL'
  | 'FAILED'

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
      const providerTypes =
        GOOGLE_PLACE_TYPES_BY_CATEGORY[
          job.category.slug as keyof typeof GOOGLE_PLACE_TYPES_BY_CATEGORY
        ] ?? []

      if (providerTypes.length === 0) {
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

        const places = await this.provider.searchNearby({
          latitude: tile.latitude,
          longitude: tile.longitude,
          radiusMeters: PLACE_SYNC_TILE_QUERY_RADIUS_METERS,
          providerTypes,
        })
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
}
