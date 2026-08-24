import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PlaceSource } from './enums/place-source.enum'
import type { PlaceSearchRequest } from './schema/place-search-request.schema'
import type { PlaceSearchItem } from './schema/place-search-response.schema'
import { PLACE_SYNC_RADIUS_METERS } from './sync/place-sync.constants'

type QueryParameter = number | string

type RawPlaceSearchRow = {
  id: string
  name: string
  address: string
  latitude: number | string
  longitude: number | string
  previewUrl: string | null
  categoryId: string
  categoryName: string
  categorySlug: string
  distanceMeters: number | string
  source: PlaceSource
  providerPlaceId: string | null
  roadAddress: string | null
  phone: string | null
  placeUrl: string | null
}

type RawCountRow = {
  total: string
}

type RawSimilarPlaceRow = {
  id: string
  name: string
  address: string
  latitude: number | string
  longitude: number | string
  previewUrl: string | null
}

export type NearbyPlacesPage = {
  items: PlaceSearchItem[]
  total: number
}

export type SimilarPlace = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  previewUrl: string | null
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

  async findNearby(
    request: PlaceSearchRequest,
    latitude: number,
    longitude: number,
  ): Promise<NearbyPlacesPage> {
    const origin = 'ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography'
    const conditions = [`ST_DWithin("place"."location", ${origin}, $3)`]
    const parameters: QueryParameter[] = [
      longitude,
      latitude,
      PLACE_SYNC_RADIUS_METERS,
    ]

    if (request.categoryId) {
      parameters.push(request.categoryId)
      conditions.push(`"category"."id" = $${parameters.length}`)
    }

    const limitParameterPosition = parameters.length + 1
    const offsetParameterPosition = parameters.length + 2
    const offset = (request.page - 1) * request.size
    const whereClause = conditions.join(' AND ')
    const fromClause = `
      FROM "place" AS "place"
      INNER JOIN "category" AS "category"
        ON "category"."id" = "place"."category_id"
      WHERE ${whereClause}
    `
    const selectQuery = `
      SELECT
        "place"."id" AS "id",
        "place"."name" AS "name",
        "place"."address" AS "address",
        "place"."latitude" AS "latitude",
        "place"."longitude" AS "longitude",
        "place"."preview_url" AS "previewUrl",
        "place"."source" AS "source",
        "place"."provider_place_id" AS "providerPlaceId",
        "place"."road_address" AS "roadAddress",
        "place"."phone" AS "phone",
        "place"."place_url" AS "placeUrl",
        "category"."id" AS "categoryId",
        "category"."name" AS "categoryName",
        "category"."slug" AS "categorySlug",
        ST_Distance("place"."location", ${origin}) AS "distanceMeters"
      ${fromClause}
      ORDER BY "distanceMeters" ASC, "place"."id" ASC
      LIMIT $${limitParameterPosition}
      OFFSET $${offsetParameterPosition}
    `
    const countQuery = `
      SELECT COUNT(*)::bigint AS "total"
      ${fromClause}
    `

    const [rows, countRows] = await Promise.all([
      this.dataSource.query(selectQuery, [
        ...parameters,
        request.size,
        offset,
      ]) as Promise<RawPlaceSearchRow[]>,
      this.dataSource.query(countQuery, parameters) as Promise<RawCountRow[]>,
    ])

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        category: {
          id: row.categoryId,
          name: row.categoryName,
          slug: row.categorySlug,
        },
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        distanceMeters: Number(row.distanceMeters),
        previewUrl: row.previewUrl,
        source: row.source,
        providerPlaceId: row.providerPlaceId,
        roadAddress: row.roadAddress,
        phone: row.phone,
        placeUrl: row.placeUrl,
      })),
      total: Number(countRows[0]?.total ?? 0),
    }
  }

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
          "place"."preview_url" AS "previewUrl"
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
      previewUrl: row.previewUrl,
    }))

    return shuffle(candidates).slice(0, limit)
  }
}
