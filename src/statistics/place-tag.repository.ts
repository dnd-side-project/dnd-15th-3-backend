import { Injectable, Logger } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { PlaceTag } from './entities/place-tag.stats-entity'
import { PlaceTagCode } from './enums/place-tag-code.enum'
import { STATISTICS_DATABASE_CONNECTION } from './statistics.constants'

type RawPlaceTagRow = {
  placeId: string
  tagCode: PlaceTagCode
}

@Injectable()
export class PlaceTagRepository {
  private readonly logger = new Logger(PlaceTagRepository.name)

  constructor(
    @InjectDataSource(STATISTICS_DATABASE_CONNECTION)
    private readonly statisticsDataSource: DataSource,
  ) {}

  async findTagCodesByPlaceIds(
    placeIds: readonly string[],
  ): Promise<Map<string, PlaceTagCode[]>> {
    const uniquePlaceIds = [...new Set(placeIds)]
    if (uniquePlaceIds.length === 0) {
      return new Map()
    }

    try {
      const rows = await this.statisticsDataSource
        .getRepository(PlaceTag)
        .createQueryBuilder('placeTag')
        .select('placeTag.placeId', 'placeId')
        .addSelect('placeTag.tagCode', 'tagCode')
        .where('placeTag.placeId IN (:...placeIds)', {
          placeIds: uniquePlaceIds,
        })
        .getRawMany<RawPlaceTagRow>()

      const tagCodesByPlaceId = new Map<string, PlaceTagCode[]>()
      for (const row of rows) {
        const tagCodes = tagCodesByPlaceId.get(row.placeId) ?? []
        tagCodes.push(row.tagCode)
        tagCodesByPlaceId.set(row.placeId, tagCodes)
      }
      return tagCodesByPlaceId
    } catch (error) {
      this.logger.warn(
        '통계 DB에서 장소 태그를 조회하지 못해 태그 없이 진행합니다.',
        error instanceof Error ? error.message : String(error),
      )
      return new Map()
    }
  }
}
