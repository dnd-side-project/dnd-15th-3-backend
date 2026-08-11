import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MeetingPlaceRecommendationVote } from './entities/meeting-place-recommendation-vote.entity'
import { PreferenceType } from './enums/preference-type.enum'

export type PreferenceCounts = {
  likeCount: number
  dislikeCount: number
}

@Injectable()
export class MeetingPlaceRecommendationVoteRepository {
  constructor(private readonly dataSource: DataSource) {}

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
