import { Injectable } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { PlaceTagCode } from './enums/place-tag-code.enum'
import {
  type PlaceTagMetricSnapshot,
  shouldHavePlaceTag,
} from './place-tag-policy'
import { normalizeQueryRows } from './statistics-query.utils'

const CURRENT_FACT_CTE = `
  WITH "latest_course" AS (
    SELECT "meeting_id", MAX("course_version") AS "course_version"
    FROM "place_selection_fact"
    GROUP BY "meeting_id"
  ),
  "current_fact" AS (
    SELECT fact.*
    FROM "place_selection_fact" AS fact
    INNER JOIN "latest_course" AS latest
      ON latest."meeting_id" = fact."meeting_id"
     AND latest."course_version" = fact."course_version"
  )
`

type PlaceMetricRow = {
  placeId: string
  evaluationCount: string
  likeCount: string
  dislikeCount: string
  selectionCount: string
  globalRankPosition: string
  globalPopulationCount: string
}

type SegmentMetricRow = {
  placeId: string
  segmentKey: string
  totalMeetingCount: string
  selectionCount: string
  selectionRatio: number | string
}

type CategoryRankRow = {
  placeId: string
  selectionCount: string
  rankPosition: string
  populationCount: string
}

type CurrentTagRow = {
  placeId: string
  tagCode: PlaceTagCode
}

export type PlaceTagRefreshResult = {
  inserted: number
  deleted: number
  total: number
}

@Injectable()
export class PlaceTagAggregationService {
  async refresh(manager: EntityManager): Promise<PlaceTagRefreshResult> {
    const snapshots = await this.loadMetricSnapshots(manager)
    const currentRows = normalizeQueryRows<CurrentTagRow>(
      await manager.query(
        `SELECT "place_id" AS "placeId", "tag_code" AS "tagCode"
         FROM "place_tag"`,
      ),
    )
    const currentKeys = new Set(
      currentRows.map((row) => this.tagKey(row.placeId, row.tagCode)),
    )
    const placeIds = new Set([
      ...snapshots.keys(),
      ...currentRows.map((row) => row.placeId),
    ])

    const desiredKeys = new Set<string>()
    for (const placeId of placeIds) {
      for (const tagCode of Object.values(PlaceTagCode)) {
        const key = this.tagKey(placeId, tagCode)
        if (
          shouldHavePlaceTag(
            snapshots.get(placeId),
            tagCode,
            currentKeys.has(key),
          )
        ) {
          desiredKeys.add(key)
        }
      }
    }

    const toInsert = [...desiredKeys]
      .filter((key) => !currentKeys.has(key))
      .map((key) => this.parseTagKey(key))
    const toDelete = [...currentKeys]
      .filter((key) => !desiredKeys.has(key))
      .map((key) => this.parseTagKey(key))

    await this.insertTags(manager, toInsert)
    await this.deleteTags(manager, toDelete)

    return {
      inserted: toInsert.length,
      deleted: toDelete.length,
      total: desiredKeys.size,
    }
  }

  private async loadMetricSnapshots(
    manager: EntityManager,
  ): Promise<Map<string, PlaceTagMetricSnapshot>> {
    const placeRows = normalizeQueryRows<PlaceMetricRow>(
      await manager.query(`${CURRENT_FACT_CTE},
        "place_metric" AS (
          SELECT
            "place_id",
            COUNT(DISTINCT "meeting_id") AS "selection_count",
            SUM("like_count") AS "like_count",
            SUM("dislike_count") AS "dislike_count",
            SUM("like_count" + "dislike_count") AS "evaluation_count"
          FROM "current_fact"
          GROUP BY "place_id"
        ),
        "ranked" AS (
          SELECT
            *,
            RANK() OVER (
              ORDER BY "selection_count" DESC
            ) AS "global_rank_position",
            COUNT(*) OVER () AS "global_population_count"
          FROM "place_metric"
        )
        SELECT
          "place_id" AS "placeId",
          "evaluation_count" AS "evaluationCount",
          "like_count" AS "likeCount",
          "dislike_count" AS "dislikeCount",
          "selection_count" AS "selectionCount",
          "global_rank_position" AS "globalRankPosition",
          "global_population_count" AS "globalPopulationCount"
        FROM "ranked"`),
    )

    const meetingRows = normalizeQueryRows<SegmentMetricRow>(
      await manager.query(`${CURRENT_FACT_CTE},
        "meeting_total" AS (
          SELECT
            "meeting_type_id",
            COUNT(DISTINCT "meeting_id") AS "total_meeting_count"
          FROM "current_fact"
          GROUP BY "meeting_type_id"
        ),
        "place_selection" AS (
          SELECT
            "place_id",
            "meeting_type_id",
            COUNT(DISTINCT "meeting_id") AS "selection_count"
          FROM "current_fact"
          GROUP BY "place_id", "meeting_type_id"
        )
        SELECT
          selection."place_id" AS "placeId",
          selection."meeting_type_id" AS "segmentKey",
          total."total_meeting_count" AS "totalMeetingCount",
          selection."selection_count" AS "selectionCount",
          selection."selection_count"::float8
            / total."total_meeting_count" AS "selectionRatio"
        FROM "place_selection" AS selection
        INNER JOIN "meeting_total" AS total
          ON total."meeting_type_id" = selection."meeting_type_id"`),
    )

    const dayRows = normalizeQueryRows<SegmentMetricRow>(
      await manager.query(`${CURRENT_FACT_CTE},
        "meeting_day" AS (
          SELECT DISTINCT
            "meeting_id",
            CASE
              WHEN EXTRACT(ISODOW FROM "meeting_date") IN (6, 7)
                THEN 'WEEKEND'
              ELSE 'WEEKDAY'
            END AS "day_type"
          FROM "current_fact"
        ),
        "day_total" AS (
          SELECT
            "day_type",
            COUNT(*) AS "total_meeting_count"
          FROM "meeting_day"
          GROUP BY "day_type"
        ),
        "place_selection" AS (
          SELECT
            fact."place_id",
            day."day_type",
            COUNT(DISTINCT fact."meeting_id") AS "selection_count"
          FROM "current_fact" AS fact
          INNER JOIN "meeting_day" AS day
            ON day."meeting_id" = fact."meeting_id"
          GROUP BY fact."place_id", day."day_type"
        )
        SELECT
          selection."place_id" AS "placeId",
          selection."day_type" AS "segmentKey",
          total."total_meeting_count" AS "totalMeetingCount",
          selection."selection_count" AS "selectionCount",
          selection."selection_count"::float8
            / total."total_meeting_count" AS "selectionRatio"
        FROM "place_selection" AS selection
        INNER JOIN "day_total" AS total
          ON total."day_type" = selection."day_type"`),
    )

    const categoryRows = normalizeQueryRows<CategoryRankRow>(
      await manager.query(`${CURRENT_FACT_CTE},
        "category_selection" AS (
          SELECT
            "place_id",
            "place_category_id",
            COUNT(DISTINCT "meeting_id") AS "selection_count"
          FROM "current_fact"
          GROUP BY "place_id", "place_category_id"
        ),
        "ranked" AS (
          SELECT
            *,
            RANK() OVER (
              PARTITION BY "place_category_id"
              ORDER BY "selection_count" DESC
            ) AS "rank_position",
            COUNT(*) OVER (
              PARTITION BY "place_category_id"
            ) AS "population_count"
          FROM "category_selection"
        )
        SELECT
          "place_id" AS "placeId",
          "selection_count" AS "selectionCount",
          "rank_position" AS "rankPosition",
          "population_count" AS "populationCount"
        FROM "ranked"`),
    )

    const snapshots = new Map<string, PlaceTagMetricSnapshot>()
    for (const row of placeRows) {
      const evaluationCount = Number(row.evaluationCount)
      const likeCount = Number(row.likeCount)
      const dislikeCount = Number(row.dislikeCount)
      snapshots.set(row.placeId, {
        placeId: row.placeId,
        evaluationCount,
        likeRatio: evaluationCount > 0 ? likeCount / evaluationCount : 0,
        dislikeRatio: evaluationCount > 0 ? dislikeCount / evaluationCount : 0,
        selectionCount: Number(row.selectionCount),
        globalRankPosition: Number(row.globalRankPosition),
        globalPopulationCount: Number(row.globalPopulationCount),
        meetingPreferences: [],
        weekendPreference: null,
        weekdayPreference: null,
        categoryRanks: [],
      })
    }

    for (const row of meetingRows) {
      snapshots.get(row.placeId)?.meetingPreferences.push({
        totalMeetingCount: Number(row.totalMeetingCount),
        selectionCount: Number(row.selectionCount),
        selectionRatio: Number(row.selectionRatio),
      })
    }
    for (const row of dayRows) {
      const snapshot = snapshots.get(row.placeId)
      if (!snapshot) continue
      const metric = {
        totalMeetingCount: Number(row.totalMeetingCount),
        selectionCount: Number(row.selectionCount),
        selectionRatio: Number(row.selectionRatio),
      }
      if (row.segmentKey === 'WEEKEND') snapshot.weekendPreference = metric
      if (row.segmentKey === 'WEEKDAY') snapshot.weekdayPreference = metric
    }
    for (const row of categoryRows) {
      snapshots.get(row.placeId)?.categoryRanks.push({
        selectionCount: Number(row.selectionCount),
        rankPosition: Number(row.rankPosition),
        populationCount: Number(row.populationCount),
      })
    }

    return snapshots
  }

  private async insertTags(
    manager: EntityManager,
    tags: Array<{ placeId: string; tagCode: PlaceTagCode }>,
  ): Promise<void> {
    if (tags.length === 0) return
    const parameters: string[] = []
    const values = tags.map((tag, index) => {
      const offset = index * 2
      parameters.push(tag.placeId, tag.tagCode)
      return `($${offset + 1}, $${offset + 2})`
    })
    await manager.query(
      `INSERT INTO "place_tag" ("place_id", "tag_code")
       VALUES ${values.join(', ')}
       ON CONFLICT ("place_id", "tag_code") DO NOTHING`,
      parameters,
    )
  }

  private async deleteTags(
    manager: EntityManager,
    tags: Array<{ placeId: string; tagCode: PlaceTagCode }>,
  ): Promise<void> {
    if (tags.length === 0) return
    const parameters: string[] = []
    const predicates = tags.map((tag, index) => {
      const offset = index * 2
      parameters.push(tag.placeId, tag.tagCode)
      return `("place_id" = $${offset + 1} AND "tag_code" = $${offset + 2})`
    })
    await manager.query(
      `DELETE FROM "place_tag" WHERE ${predicates.join(' OR ')}`,
      parameters,
    )
  }

  private tagKey(placeId: string, tagCode: PlaceTagCode): string {
    return `${placeId}:${tagCode}`
  }

  private parseTagKey(key: string): {
    placeId: string
    tagCode: PlaceTagCode
  } {
    const separatorIndex = key.indexOf(':')
    return {
      placeId: key.slice(0, separatorIndex),
      tagCode: key.slice(separatorIndex + 1) as PlaceTagCode,
    }
  }
}
