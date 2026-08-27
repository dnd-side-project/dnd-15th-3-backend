import { Injectable } from '@nestjs/common'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { DataSource } from 'typeorm'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { MeetingPlaceRecommendation } from './entities/meeting-place-recommendation.entity'

@Injectable()
export class MeetingPlaceRecommendationRepository {
  constructor(private readonly dataSource: DataSource) {}

  findByMeeting(meetingId: string): Promise<MeetingPlaceRecommendation[]> {
    return this.dataSource
      .getRepository(MeetingPlaceRecommendation)
      .createQueryBuilder('recommendation')
      .innerJoinAndSelect('recommendation.place', 'place')
      .innerJoinAndSelect('place.category', 'category')
      .where('recommendation.meeting_id = :meetingId', { meetingId })
      .orderBy('recommendation.createdAt', 'ASC')
      .getMany()
  }

  findExcludedFromCourse(
    meetingId: string,
    courseCandidateId: string,
    category?: CategorySlug,
  ): Promise<MeetingPlaceRecommendation[]> {
    const query = this.dataSource
      .getRepository(MeetingPlaceRecommendation)
      .createQueryBuilder('recommendation')
      .innerJoinAndSelect('recommendation.place', 'place')
      .innerJoinAndSelect('place.category', 'category')
      .leftJoin(
        CourseCandidatePlace,
        'candidatePlace',
        'candidatePlace.meeting_place_recommendation_id = recommendation.id AND candidatePlace.course_candidate_id = :courseCandidateId',
        { courseCandidateId },
      )
      .where('recommendation.meeting_id = :meetingId', { meetingId })
      .andWhere('candidatePlace.id IS NULL')
      .orderBy('recommendation.createdAt', 'ASC')

    if (category) {
      query.andWhere('category.slug = :categorySlug', {
        categorySlug: category,
      })
    }

    return query.getMany()
  }
}
