import { Injectable } from '@nestjs/common'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import type { ResolvedQuestionnaireAnswers } from 'src/questionnaire/questionnaire.service'
import { QuestionnaireService } from 'src/questionnaire/questionnaire.service'
import type { EntityManager } from 'typeorm'
import { CourseRepository } from './course.repository'
import { CourseCategoryStep } from './entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from './entities/meeting-place-recommendation.entity'
import { CourseGenerationCustomizationType } from './enums/course-generation-customization-type.enum'
import { CourseException } from './exception/course.exception'
import { CourseErrorCode } from './exception/course-error-code'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'
import {
  type CourseGenerationInputSnapshot,
  courseGenerationInputSchema,
} from './schema/course-generation-input.schema'
import type { GenerateCourseRequest } from './schema/generate-course-request.schema'

export type CourseGenerationSnapshotResult = {
  inputSnapshot: CourseGenerationInputSnapshot
  questionnaireResult: ResolvedQuestionnaireAnswers | null
}

/**
 * 코스 생성 시점의 DB 데이터(카테고리 단계·추천 장소·투표수·질문답변)를
 * 조회해 CourseGenerationRun.inputSnapshot으로 저장할 스냅샷을 조립한다.
 */
@Injectable()
export class CourseGenerationInputSnapshotBuilder {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly voteRepository: MeetingPlaceRecommendationVoteRepository,
    private readonly questionnaireService: QuestionnaireService,
  ) {}

  async build(
    manager: EntityManager,
    meeting: Meeting,
    request: GenerateCourseRequest,
  ): Promise<CourseGenerationSnapshotResult> {
    const meetingId = meeting.id

    const [steps, recommendations, participantCount] = await Promise.all([
      manager.getRepository(CourseCategoryStep).find({
        where: { meeting: { id: meetingId } },
        relations: { category: true },
        order: { order: 'ASC' },
      }),
      manager.getRepository(MeetingPlaceRecommendation).find({
        where: { meeting: { id: meetingId } },
        relations: { place: { category: true } },
        order: { createdAt: 'ASC' },
      }),
      this.courseRepository.countParticipants(manager, meetingId),
    ])
    this.assertRecommendationsCoverSteps(steps, recommendations)

    const recommendationIds = recommendations.map(
      (recommendation) => recommendation.id,
    )
    const voteCounts = await this.voteRepository.getVoteCountsByRecommendation(
      manager,
      recommendationIds,
    )

    const questionnaireResult =
      request.customization.type ===
      CourseGenerationCustomizationType.Questionnaire
        ? await this.questionnaireService.resolveAnswers(
            manager,
            meetingId,
            request.customization.questionnaireId,
            request.customization.questionnaireVersion,
            request.customization.answers,
          )
        : null

    const location = meeting.meetingLocation

    const inputSnapshot = courseGenerationInputSchema.parse({
      schemaVersion: 1,
      meeting: {
        meetingId,
        meetingTypeId: meeting.meetingType.id,
        meetingTypeCode: meeting.meetingType.code as MeetingTypeCode,
        date: meeting.date,
        time: meeting.time,
        courseVersion: meeting.courseVersion,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
      participantCount,
      categorySteps: steps.map((step) => ({
        order: step.order,
        categoryId: step.category.id,
        categorySlug: step.category.slug as CategorySlug,
      })),
      recommendations: recommendations.map((recommendation) => {
        const counts = voteCounts.get(recommendation.id)
        const common = {
          recommendationId: recommendation.id,
          placeId: recommendation.place.id,
          placeCategoryId: recommendation.place.category.id,
          categorySlug: recommendation.place.category.slug as CategorySlug,
          likeCount: counts?.likeCount ?? 0,
          dislikeCount: counts?.dislikeCount ?? 0,
        }
        if (recommendation.place.source === PlaceSource.Kakao) {
          if (!recommendation.place.providerPlaceId) {
            throw new CourseException(CourseErrorCode.generationInputIncomplete)
          }
          return {
            ...common,
            source: PlaceSource.Kakao,
            providerPlaceId: recommendation.place.providerPlaceId,
            placeUrl: recommendation.place.placeUrl,
          }
        }
        return {
          ...common,
          name: recommendation.place.name,
          address: recommendation.place.address,
          latitude: recommendation.place.latitude,
          longitude: recommendation.place.longitude,
        }
      }),
      questionnaire: questionnaireResult?.snapshot ?? null,
    })

    return { inputSnapshot, questionnaireResult }
  }

  private assertRecommendationsCoverSteps(
    steps: CourseCategoryStep[],
    recommendations: MeetingPlaceRecommendation[],
  ): void {
    if (steps.length === 0) {
      throw new CourseException(CourseErrorCode.generationInputIncomplete)
    }

    const requiredByCategory = new Map<string, number>()
    for (const step of steps) {
      requiredByCategory.set(
        step.category.id,
        (requiredByCategory.get(step.category.id) ?? 0) + 1,
      )
    }
    const availableByCategory = new Map<string, number>()
    for (const recommendation of recommendations) {
      const categoryId = recommendation.place.category.id
      availableByCategory.set(
        categoryId,
        (availableByCategory.get(categoryId) ?? 0) + 1,
      )
    }

    for (const [categoryId, required] of requiredByCategory) {
      if ((availableByCategory.get(categoryId) ?? 0) < required) {
        throw new CourseException(CourseErrorCode.generationInputIncomplete)
      }
    }
  }
}
