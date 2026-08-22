import { Inject, Injectable, Logger } from '@nestjs/common'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { DataSource } from 'typeorm'
import { COURSE_CANDIDATE_GENERATOR } from './course-generation.tokens'
import {
  type CourseGenerationLeg,
  CourseGenerationRouteService,
} from './course-generation-route.service'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseGenerationRun } from './entities/course-generation-run.entity'
import { MeetingPlaceRecommendation } from './entities/meeting-place-recommendation.entity'
import { CourseGenerationRunStatus } from './enums/course-generation-run-status.enum'
import type { CourseCandidateGenerator } from './provider/course-candidate.generator'
import {
  type CourseGenerationInputSnapshot,
  courseGenerationInputSchema,
} from './schema/course-generation-input.schema'
import {
  type CourseGenerationOutputSnapshot,
  courseGenerationOutputSchema,
} from './schema/course-generation-output.schema'

type PreparedCandidate = {
  name: string
  recommendations: CourseGenerationInputSnapshot['recommendations']
  legs: CourseGenerationLeg[]
}

@Injectable()
export class CourseGenerationProcessor {
  private readonly logger = new Logger(CourseGenerationProcessor.name)

  constructor(
    private readonly dataSource: DataSource,
    @Inject(COURSE_CANDIDATE_GENERATOR)
    private readonly generator: CourseCandidateGenerator,
    private readonly routeService: CourseGenerationRouteService,
  ) {}

  async processRun(runId: string): Promise<void> {
    try {
      const run = await this.dataSource
        .getRepository(CourseGenerationRun)
        .findOne({
          where: { id: runId },
        })
      if (!run || run.status !== CourseGenerationRunStatus.Processing) return

      const input = courseGenerationInputSchema.parse(run.inputSnapshot)
      const output = courseGenerationOutputSchema.parse(
        await this.generator.generate(input),
      )
      const preparedCandidates = await this.prepareCandidates(input, output)
      await this.completeRun(
        runId,
        input.meeting.meetingId,
        output,
        preparedCandidates,
      )
    } catch (error) {
      this.logger.error(
        `코스 생성 작업에 실패했습니다. runId=${runId}`,
        error instanceof Error ? error.stack : String(error),
      )
      await this.failRun(runId, error)
    }
  }

  private prepareCandidates(
    input: CourseGenerationInputSnapshot,
    output: CourseGenerationOutputSnapshot,
  ): Promise<PreparedCandidate[]> {
    const recommendationsById = new Map(
      input.recommendations.map((recommendation) => [
        recommendation.recommendationId,
        recommendation,
      ]),
    )

    return Promise.all(
      output.candidates.map(async (candidate) => {
        if (candidate.recommendationIds.length !== input.categorySteps.length) {
          throw new Error('Generated course does not match category step count')
        }
        const recommendations = candidate.recommendationIds.map(
          (recommendationId, index) => {
            const recommendation = recommendationsById.get(recommendationId)
            if (
              !recommendation ||
              recommendation.categorySlug !==
                input.categorySteps[index].categorySlug
            ) {
              throw new Error(
                `Generated course recommendation is invalid at step ${index + 1}`,
              )
            }
            return recommendation
          },
        )
        return {
          name: candidate.name,
          recommendations,
          legs: await this.routeService.getLegs(recommendations),
        }
      }),
    )
  }

  private completeRun(
    runId: string,
    meetingId: string,
    output: CourseGenerationOutputSnapshot,
    candidates: PreparedCandidate[],
  ): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const runRepository = manager.getRepository(CourseGenerationRun)
      const run = await runRepository
        .createQueryBuilder('run')
        .where('run.id = :runId', { runId })
        .setLock('pessimistic_write')
        .getOne()
      if (!run || run.status !== CourseGenerationRunStatus.Processing) return

      const meetingRepository = manager.getRepository(Meeting)
      const meeting = await meetingRepository
        .createQueryBuilder('meeting')
        .where('meeting.id = :meetingId', { meetingId })
        .setLock('pessimistic_write')
        .getOne()
      if (!meeting || meeting.status !== MeetingStatus.CourseGenerating) {
        throw new Error('Meeting is not in course generating state')
      }

      await manager
        .getRepository(CourseCandidate)
        .createQueryBuilder()
        .delete()
        .from(CourseCandidate)
        .where('meeting_id = :meetingId', { meetingId })
        .execute()

      const candidateRepository = manager.getRepository(CourseCandidate)
      const candidatePlaceRepository =
        manager.getRepository(CourseCandidatePlace)
      for (const [candidateIndex, prepared] of candidates.entries()) {
        const candidate = await candidateRepository.save(
          candidateRepository.create({
            meeting,
            generationRun: run,
            order: candidateIndex + 1,
            name: prepared.name,
            isSelected: false,
          }),
        )
        await candidatePlaceRepository.save(
          prepared.recommendations.map((recommendation, stepIndex) =>
            candidatePlaceRepository.create({
              courseCandidate: candidate,
              meetingPlaceRecommendation: {
                id: recommendation.recommendationId,
              } as MeetingPlaceRecommendation,
              order: stepIndex + 1,
              travelTimeToNext: prepared.legs[stepIndex].travelTimeToNext,
              distanceToNextMeters:
                prepared.legs[stepIndex].distanceToNextMeters,
            }),
          ),
        )
      }

      run.status = CourseGenerationRunStatus.Succeeded
      run.outputSnapshot = output
      run.errorMessage = null
      run.completedAt = new Date()
      meeting.completeCourseGeneration()
      await Promise.all([
        runRepository.save(run),
        meetingRepository.save(meeting),
      ])
    })
  }

  private failRun(runId: string, error: unknown): Promise<void> {
    const message =
      error instanceof Error ? error.message.slice(0, 2000) : String(error)
    return this.dataSource.transaction(async (manager) => {
      const runRepository = manager.getRepository(CourseGenerationRun)
      const run = await runRepository
        .createQueryBuilder('run')
        .leftJoinAndSelect('run.meeting', 'meeting')
        .where('run.id = :runId', { runId })
        .setLock('pessimistic_write')
        .getOne()
      if (!run || run.status !== CourseGenerationRunStatus.Processing) return

      run.status = CourseGenerationRunStatus.Failed
      run.outputSnapshot = null
      run.errorMessage = message
      run.completedAt = new Date()
      if (run.meeting.status === MeetingStatus.CourseGenerating) {
        run.meeting.failCourseGeneration()
        await manager.getRepository(Meeting).save(run.meeting)
      }
      await runRepository.save(run)
    })
  }
}
