import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { CourseGenerationRunStatus } from '../enums/course-generation-run-status.enum'
import { CourseGenerationRun } from './course-generation-run.entity'

function createRun(
  status: CourseGenerationRunStatus,
  overrides: Partial<CourseGenerationRun> = {},
): CourseGenerationRun {
  return Object.assign(new CourseGenerationRun(), { status, ...overrides })
}

describe('CourseGenerationRun entity', () => {
  describe('isFailed', () => {
    it('status가 Failed이면 true를 반환한다', () => {
      expect(createRun(CourseGenerationRunStatus.Failed).isFailed()).toBe(true)
    })

    it('status가 Failed가 아니면 false를 반환한다', () => {
      expect(createRun(CourseGenerationRunStatus.Succeeded).isFailed()).toBe(
        false,
      )
    })
  })

  describe('isPending', () => {
    it('status가 Pending이면 true를 반환한다', () => {
      expect(createRun(CourseGenerationRunStatus.Pending).isPending()).toBe(
        true,
      )
    })

    it('status가 Pending이 아니면 false를 반환한다', () => {
      expect(createRun(CourseGenerationRunStatus.Processing).isPending()).toBe(
        false,
      )
    })
  })

  describe('isResumable', () => {
    it.each([
      CourseGenerationRunStatus.Pending,
      CourseGenerationRunStatus.Processing,
    ])('status가 %s이면 true를 반환한다', (status) => {
      expect(createRun(status).isResumable()).toBe(true)
    })

    it.each([
      CourseGenerationRunStatus.Succeeded,
      CourseGenerationRunStatus.Failed,
    ])('status가 %s이면 false를 반환한다', (status) => {
      expect(createRun(status).isResumable()).toBe(false)
    })
  })

  describe('prepareForProcessing', () => {
    it('상태를 Processing으로 되돌리고 이전 결과·에러를 지운다', () => {
      const participant = Object.assign(new MeetingParticipant(), {
        id: 'participant-2',
      })
      const run = createRun(CourseGenerationRunStatus.Failed, {
        attemptCount: 1,
        errorMessage: '이전 실패 사유',
        outputSnapshot: { schemaVersion: 1 } as never,
        completedAt: new Date('2026-01-01'),
      })

      run.prepareForProcessing(participant)

      expect(run.status).toBe(CourseGenerationRunStatus.Processing)
      expect(run.requestedBy).toBe(participant)
      expect(run.attemptCount).toBe(2)
      expect(run.errorMessage).toBeNull()
      expect(run.outputSnapshot).toBeNull()
      expect(run.completedAt).toBeNull()
      expect(run.startedAt).toBeInstanceOf(Date)
    })
  })
})
