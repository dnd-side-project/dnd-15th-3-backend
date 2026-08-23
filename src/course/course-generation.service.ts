import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { assertAccessToken } from 'src/meeting/access/meeting-access.utils'
import { COURSE_GENERATABLE_STATUSES } from 'src/meeting/constants/meeting-status.constants'
import { MeetingStatusResponseDto } from 'src/meeting/dto/meeting-status-response.dto'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { MeetingException } from 'src/meeting/exception/meeting.exception'
import { MeetingErrorCode } from 'src/meeting/exception/meeting-error-code'
import { DataSource, type EntityManager } from 'typeorm'
import { CourseRepository } from './course.repository'
import { CourseGenerationProcessor } from './course-generation.processor'
import { CourseGenerationInputSnapshotBuilder } from './course-generation-input-snapshot.builder'
import { CourseGenerationQuestionnaireAnswer } from './entities/course-generation-questionnaire-answer.entity'
import { CourseGenerationRun } from './entities/course-generation-run.entity'
import { CourseGenerationRunStatus } from './enums/course-generation-run-status.enum'
import { CourseException } from './exception/course.exception'
import { CourseErrorCode } from './exception/course-error-code'
import type { CourseGenerationInputSnapshot } from './schema/course-generation-input.schema'
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
    private readonly snapshotBuilder: CourseGenerationInputSnapshotBuilder,
    private readonly processor: CourseGenerationProcessor,
  ) {}

  async generateCourse(
    meetingId: string,
    accessToken: string,
    request: GenerateCourseRequest,
  ): Promise<MeetingStatusResponseDto> {
    assertAccessToken(accessToken)
    const normalizedAccessToken = accessToken.trim()

    const preparation =
      await this.dataSource.transaction<CourseGenerationPreparation>(
        async (manager) => {
          const participant = await manager
            .getRepository(MeetingParticipant)
            .findOne({
              where: {
                meeting: { id: meetingId },
                accessToken: normalizedAccessToken,
              },
            })
          if (!participant) {
            const meetingExists = await manager
              .getRepository(Meeting)
              .exists({ where: { id: meetingId } })
            if (!meetingExists) {
              throw new MeetingException(MeetingErrorCode.notFound)
            }
            throw new CommonException(CommonErrorCode.authenticationFailed)
          }
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

          const { inputSnapshot, questionnaireResult } =
            await this.snapshotBuilder.build(manager, meeting, request)

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

  private hashSnapshot(snapshot: CourseGenerationInputSnapshot): string {
    return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
  }
}
