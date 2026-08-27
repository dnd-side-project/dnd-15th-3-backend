import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PlaceSource } from './enums/place-source.enum'

type RawSimilarPlaceRow = {
  id: string
  name: string
  address: string
  latitude: number | string
  longitude: number | string
  source: PlaceSource
  providerPlaceId: string | null
  roadAddress: string | null
  phone: string | null
  placeUrl: string | null
}

export type SimilarPlace = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  source: PlaceSource
  providerPlaceId: string | null
  roadAddress: string | null
  phone: string | null
  placeUrl: string | null
}

export const SIMILAR_PLACE_CANDIDATE_POOL_SIZE = 200

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

@Injectable()
export class PlaceRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findSimilar(
    categoryId: string,
    excludedPlaceIds: readonly string[],
    latitude: number,
    longitude: number,
    radiusMeters: number,
    limit: number,
  ): Promise<SimilarPlace[]> {
    const rows = (await this.dataSource.query(
      `
        SELECT
          "place"."id" AS "id",
          "place"."name" AS "name",
          "place"."address" AS "address",
          "place"."latitude" AS "latitude",
          "place"."longitude" AS "longitude",
          "place"."source" AS "source",
          "place"."provider_place_id" AS "providerPlaceId",
          "place"."road_address" AS "roadAddress",
          "place"."phone" AS "phone",
          "place"."place_url" AS "placeUrl"
        FROM "place" AS "place"
        WHERE "place"."category_id" = $1
          AND "place"."id" <> ALL($2::bigint[])
          AND ST_DWithin(
            "place"."location",
            ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
            $5
          )
        ORDER BY "place"."location" <-> ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
        LIMIT $6
      `,
      [
        categoryId,
        excludedPlaceIds,
        longitude,
        latitude,
        radiusMeters,
        SIMILAR_PLACE_CANDIDATE_POOL_SIZE,
      ],
    )) as RawSimilarPlaceRow[]

    const candidates = rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      source: row.source,
      providerPlaceId: row.providerPlaceId,
      roadAddress: row.roadAddress,
      phone: row.phone,
      placeUrl: row.placeUrl,
    }))

    return shuffle(candidates).slice(0, limit)
  }
}
