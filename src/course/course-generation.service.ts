import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingAccessService } from 'src/meeting/access/meeting-access.service'
import { COURSE_GENERATABLE_STATUSES } from 'src/meeting/constants/meeting-status.constants'
import { MeetingStatusResponseDto } from 'src/meeting/dto/meeting-status-response.dto'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { MeetingException } from 'src/meeting/exception/meeting.exception'
import { MeetingErrorCode } from 'src/meeting/exception/meeting-error-code'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import { QuestionnaireService } from 'src/questionnaire/questionnaire.service'
import { DataSource, type EntityManager } from 'typeorm'
import { CourseRepository } from './course.repository'
import { CourseGenerationProcessor } from './course-generation.processor'
import { CourseCategoryStep } from './entities/course-category-step.entity'
import { CourseGenerationQuestionnaireAnswer } from './entities/course-generation-questionnaire-answer.entity'
import { CourseGenerationRun } from './entities/course-generation-run.entity'
import { MeetingPlaceRecommendation } from './entities/meeting-place-recommendation.entity'
import { CourseGenerationCustomizationType } from './enums/course-generation-customization-type.enum'
import { CourseGenerationRunStatus } from './enums/course-generation-run-status.enum'
import { CourseException } from './exception/course.exception'
import { CourseErrorCode } from './exception/course-error-code'
import { MeetingPlaceRecommendationVoteRepository } from './meeting-place-recommendation-vote.repository'
import {
  type CourseGenerationInputSnapshot,
  courseGenerationInputSchema,
} from './schema/course-generation-input.schema'
import type { GenerateCourseRequest } from './schema/generate-course-request.schema'

type CourseGenerationPreparation =
  | { runId: string }
  | { runId: null; status: MeetingStatus.CourseGenerating }

const COURSE_GENERATION_STALE_AFTER_MS = 5 * 60 * 1000

@Injectable()
export class CourseGenerationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly courseRepository: CourseRepository,
    private readonly voteRepository: MeetingPlaceRecommendationVoteRepository,
    private readonly questionnaireService: QuestionnaireService,
    private readonly processor: CourseGenerationProcessor,
    private readonly meetingAccessService: MeetingAccessService,
  ) {}

  async generateCourse(
    meetingId: string,
    accessToken: string,
    request: GenerateCourseRequest,
  ): Promise<MeetingStatusResponseDto> {
    const preparation =
      await this.dataSource.transaction<CourseGenerationPreparation>(
        async (manager) => {
          const participant = await this.meetingAccessService.findParticipant(
            meetingId,
            accessToken,
            manager,
          )
          participant.assertHost(MeetingErrorCode.hostOnly)

          const meeting = await this.courseRepository.lockMeeting(
            manager,
            meetingId,
          )
          if (!meeting) {
            throw new MeetingException(MeetingErrorCode.notFound)
          }

          if (meeting.status === MeetingStatus.CourseGenerating) {
            return this.resumeGenerationRun(manager, meeting, participant)
          }

          if (meeting.status === MeetingStatus.CourseGenerationFailed) {
            return {
              runId: await this.retryFailedRun(manager, meeting, participant),
            }
          }

          meeting.assertStatus(
            COURSE_GENERATABLE_STATUSES,
            MeetingErrorCode.courseNotGeneratable,
          )
          meeting.assertHasLocation()

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
          const voteCounts =
            await this.voteRepository.getVoteCountsByRecommendation(
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
                categorySlug: recommendation.place.category
                  .slug as CategorySlug,
                likeCount: counts?.likeCount ?? 0,
                dislikeCount: counts?.dislikeCount ?? 0,
              }
              if (recommendation.place.source === PlaceSource.Kakao) {
                if (!recommendation.place.providerPlaceId) {
                  throw new CourseException(
                    CourseErrorCode.generationInputIncomplete,
                  )
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

          const runRepository = manager.getRepository(CourseGenerationRun)
          const latestRun = await runRepository.findOne({
            where: { meeting: { id: meetingId } },
            order: { runVersion: 'DESC' },
          })
          const run = await runRepository.save(
            runRepository.create({
              meeting,
              requestedBy: participant,
              questionnaire: questionnaireResult?.questionnaire ?? null,
              runVersion: (latestRun?.runVersion ?? 0) + 1,
              status: CourseGenerationRunStatus.Processing,
              customizationType: request.customization.type,
              inputSnapshot,
              inputHash: this.hashSnapshot(inputSnapshot),
              outputSnapshot: null,
              attemptCount: 1,
              errorMessage: null,
              startedAt: new Date(),
              completedAt: null,
            }),
          )

          if (questionnaireResult) {
            const answerRepository = manager.getRepository(
              CourseGenerationQuestionnaireAnswer,
            )
            await answerRepository.save(
              questionnaireResult.answers.map(({ question, option }) =>
                answerRepository.create({
                  generationRun: run,
                  question,
                  option,
                }),
              ),
            )
          }

          meeting.startCourseGeneration()
          await manager.getRepository(Meeting).save(meeting)

          return { runId: run.id }
        },
      )

    if (preparation.runId === null) {
      return {
        status: preparation.status,
        confirmedCourseCandidateId: null,
      }
    }

    const status = await this.processor.processRun(preparation.runId)
    return { status, confirmedCourseCandidateId: null }
  }

  private async retryFailedRun(
    manager: EntityManager,
    meeting: Meeting,
    participant: MeetingParticipant,
  ): Promise<string> {
    const repository = manager.getRepository(CourseGenerationRun)
    const latestRun = await repository.findOne({
      where: { meeting: { id: meeting.id } },
      order: { runVersion: 'DESC' },
    })
    if (!latestRun || latestRun.status !== CourseGenerationRunStatus.Failed) {
      throw new CourseException(CourseErrorCode.generationRunMissing)
    }

    this.prepareRunForProcessing(latestRun, participant)
    await repository.save(latestRun)

    meeting.startCourseGeneration()
    await manager.getRepository(Meeting).save(meeting)
    return latestRun.id
  }

  private async resumeGenerationRun(
    manager: EntityManager,
    meeting: Meeting,
    participant: MeetingParticipant,
  ): Promise<CourseGenerationPreparation> {
    const repository = manager.getRepository(CourseGenerationRun)
    const latestRun = await repository.findOne({
      where: { meeting: { id: meeting.id } },
      order: { runVersion: 'DESC' },
    })
    if (
      !latestRun ||
      ![
        CourseGenerationRunStatus.Pending,
        CourseGenerationRunStatus.Processing,
      ].includes(latestRun.status)
    ) {
      throw new CourseException(CourseErrorCode.generationRunMissing)
    }

    const staleBefore = Date.now() - COURSE_GENERATION_STALE_AFTER_MS
    const isPending = latestRun.status === CourseGenerationRunStatus.Pending
    const isStale =
      !latestRun.startedAt || latestRun.startedAt.getTime() < staleBefore
    if (!isPending && !isStale) {
      return { runId: null, status: MeetingStatus.CourseGenerating }
    }

    this.prepareRunForProcessing(latestRun, participant)
    await repository.save(latestRun)
    return { runId: latestRun.id }
  }

  private prepareRunForProcessing(
    run: CourseGenerationRun,
    participant: MeetingParticipant,
  ): void {
    run.status = CourseGenerationRunStatus.Processing
    run.requestedBy = participant
    run.attemptCount += 1
    run.errorMessage = null
    run.outputSnapshot = null
    run.startedAt = new Date()
    run.completedAt = null
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

  private hashSnapshot(snapshot: CourseGenerationInputSnapshot): string {
    return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
  }
}
