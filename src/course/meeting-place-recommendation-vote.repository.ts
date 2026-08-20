import { Injectable } from '@nestjs/common'
import { DataSource, type EntityManager } from 'typeorm'
import { MeetingPlaceRecommendationVote } from './entities/meeting-place-recommendation-vote.entity'
import { PreferenceType } from './enums/preference-type.enum'

export type PreferenceCounts = {
  likeCount: number
  dislikeCount: number
}

export type PreferenceSummary = PreferenceCounts & {
  myPreference: PreferenceType | null
}

type RawPreferenceSummaryRow = {
  recommendationId: string
  likeCount: string
  dislikeCount: string
  myPreference: PreferenceType | null
}

@Injectable()
export class MeetingPlaceRecommendationVoteRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getPreferenceSummaries(
    recommendationIds: readonly string[],
    viewerId: string,
  ): Promise<Map<string, PreferenceSummary>> {
    if (recommendationIds.length === 0) {
      return new Map()
    }

    const rows = await this.dataSource
      .getRepository(MeetingPlaceRecommendationVote)
      .createQueryBuilder('vote')
      .select('vote.recommendation', 'recommendationId')
      .addSelect('COUNT(*) FILTER (WHERE vote.preference = :like)', 'likeCount')
      .addSelect(
        'COUNT(*) FILTER (WHERE vote.preference = :dislike)',
        'dislikeCount',
      )
      .addSelect(
        'MAX(CASE WHEN vote.participant = :viewerId THEN vote.preference::text END)',
        'myPreference',
      )
      .where('vote.recommendation IN (:...recommendationIds)', {
        recommendationIds,
      })
      .setParameters({
        like: PreferenceType.Like,
        dislike: PreferenceType.Dislike,
        viewerId,
      })
      .groupBy('vote.recommendation')
      .getRawMany<RawPreferenceSummaryRow>()

    return new Map(
      rows.map((row) => [
        row.recommendationId,
        {
          likeCount: Number(row.likeCount),
          dislikeCount: Number(row.dislikeCount),
          myPreference: row.myPreference,
        },
      ]),
    )
  }

  async getVoteCountsByRecommendation(
    manager: EntityManager,
    recommendationIds: readonly string[],
  ): Promise<Map<string, PreferenceCounts>> {
    if (recommendationIds.length === 0) {
      return new Map()
    }

    const rows = await manager
      .getRepository(MeetingPlaceRecommendationVote)
      .createQueryBuilder('vote')
      .select('vote.recommendation', 'recommendationId')
      .addSelect('COUNT(*) FILTER (WHERE vote.preference = :like)', 'likeCount')
      .addSelect(
        'COUNT(*) FILTER (WHERE vote.preference = :dislike)',
        'dislikeCount',
      )
      .where('vote.recommendation IN (:...recommendationIds)', {
        recommendationIds,
      })
      .setParameters({
        like: PreferenceType.Like,
        dislike: PreferenceType.Dislike,
      })
      .groupBy('vote.recommendation')
      .getRawMany<{
        recommendationId: string
        likeCount: string
        dislikeCount: string
      }>()

    return new Map(
      rows.map((row) => [
        row.recommendationId,
        {
          likeCount: Number(row.likeCount),
          dislikeCount: Number(row.dislikeCount),
        },
      ]),
    )
  }

  applyPreference(
    recommendationId: string,
    participantId: string,
    preference: PreferenceType | null,
  ): Promise<PreferenceCounts> {
    return this.dataSource.transaction(async (manager) => {
      const voteRepository = manager.getRepository(
        MeetingPlaceRecommendationVote,
      )

      if (preference === null) {
        await voteRepository.delete({
          recommendation: { id: recommendationId },
          participant: { id: participantId },
        })
      } else {
        await voteRepository.upsert(
          {
            recommendation: { id: recommendationId },
            participant: { id: participantId },
            preference,
            updatedAt: new Date(),
          },
          ['recommendation', 'participant'],
        )
      }

      const rows = await voteRepository
        .createQueryBuilder('vote')
        .select('vote.preference', 'preference')
        .addSelect('COUNT(*)', 'count')
        .where('vote.recommendation = :recommendationId', {
          recommendationId,
        })
        .groupBy('vote.preference')
        .getRawMany<{ preference: PreferenceType; count: string }>()

      return {
        likeCount: Number(
          rows.find((row) => row.preference === PreferenceType.Like)?.count ??
            0,
        ),
        dislikeCount: Number(
          rows.find((row) => row.preference === PreferenceType.Dislike)
            ?.count ?? 0,
        ),
      }
    })
  }
}
