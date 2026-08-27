import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingLocation } from 'src/meeting/entities/meeting-location.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { CourseRepository } from './course.repository'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseCategoryStep } from './entities/course-category-step.entity'

function createManagerMocks() {
  const meetingQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  }
  const meetingRepository = {
    createQueryBuilder: jest.fn(() => meetingQueryBuilder),
    findOne: jest.fn(),
  }
  const locationQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  }
  const locationRepository = {
    createQueryBuilder: jest.fn(() => locationQueryBuilder),
  }
  const categoryStepDeleteQueryBuilder = {
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  }
  const categoryStepRepository = {
    createQueryBuilder: jest.fn(() => categoryStepDeleteQueryBuilder),
  }
  const placeDeleteQueryBuilder = {
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  }
  const placeRepository = {
    createQueryBuilder: jest.fn(() => placeDeleteQueryBuilder),
  }
  const participantRepository = {
    count: jest.fn(),
  }
  const repositories = new Map<unknown, unknown>([
    [Meeting, meetingRepository],
    [MeetingLocation, locationRepository],
    [CourseCategoryStep, categoryStepRepository],
    [CourseCandidatePlace, placeRepository],
    [MeetingParticipant, participantRepository],
  ])
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  }

  return {
    manager,
    meetingQueryBuilder,
    meetingRepository,
    locationQueryBuilder,
    locationRepository,
    categoryStepDeleteQueryBuilder,
    categoryStepRepository,
    placeDeleteQueryBuilder,
    placeRepository,
    participantRepository,
  }
}

describe('CourseRepository', () => {
  describe('lockMeeting', () => {
    it('meeting과 meetingLocation을 각각 pessimistic_write로 잠그고, meetingType은 잠금 없이 합쳐서 반환한다', async () => {
      const repository = new CourseRepository()
      const {
        manager,
        meetingQueryBuilder,
        meetingRepository,
        locationQueryBuilder,
      } = createManagerMocks()
      const meeting = { id: '1' }
      const location = { id: 'location-1' }
      const meetingType = { id: 'type-1', code: 'SOCIAL' }
      meetingQueryBuilder.getOne.mockResolvedValue(meeting)
      locationQueryBuilder.getOne.mockResolvedValue(location)
      meetingRepository.findOne.mockResolvedValue({ meetingType })

      const result = await repository.lockMeeting(manager as never, '1')

      expect(result).toBe(meeting)
      expect(result).toMatchObject({ meetingLocation: location, meetingType })
      expect(meetingQueryBuilder.where).toHaveBeenCalledWith(
        'meeting.id = :id',
        { id: '1' },
      )
      expect(meetingQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      )
      expect(locationQueryBuilder.where).toHaveBeenCalledWith(
        'location.meeting_id = :id',
        { id: '1' },
      )
      expect(locationQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      )
      expect(meetingRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: { meetingType: true },
      })
    })

    it('모임이 없으면 null을 그대로 반환한다', async () => {
      const repository = new CourseRepository()
      const {
        manager,
        meetingQueryBuilder,
        locationQueryBuilder,
        meetingRepository,
      } = createManagerMocks()
      meetingQueryBuilder.getOne.mockResolvedValue(null)
      locationQueryBuilder.getOne.mockResolvedValue(null)
      meetingRepository.findOne.mockResolvedValue(null)

      await expect(
        repository.lockMeeting(manager as never, '1'),
      ).resolves.toBeNull()
    })

    it('meetingLocation이 없어도 모임은 정상적으로 잠가서 반환한다', async () => {
      const repository = new CourseRepository()
      const {
        manager,
        meetingQueryBuilder,
        locationQueryBuilder,
        meetingRepository,
      } = createManagerMocks()
      const meeting = { id: '1' }
      meetingQueryBuilder.getOne.mockResolvedValue(meeting)
      locationQueryBuilder.getOne.mockResolvedValue(null)
      meetingRepository.findOne.mockResolvedValue({
        meetingType: { id: 'type-1' },
      })

      const result = await repository.lockMeeting(manager as never, '1')

      expect(result).toMatchObject({ meetingLocation: null })
    })
  })

  describe('deleteCourseCategorySteps', () => {
    it('meetingId에 해당하는 카테고리 스텝을 전부 삭제한다', async () => {
      const repository = new CourseRepository()
      const { manager, categoryStepDeleteQueryBuilder } = createManagerMocks()

      await repository.deleteCourseCategorySteps(manager as never, '1')

      expect(categoryStepDeleteQueryBuilder.delete).toHaveBeenCalled()
      expect(categoryStepDeleteQueryBuilder.where).toHaveBeenCalledWith(
        'meeting_id = :meetingId',
        { meetingId: '1' },
      )
      expect(categoryStepDeleteQueryBuilder.execute).toHaveBeenCalled()
    })
  })

  describe('deleteCourseCandidatePlaces', () => {
    it('courseCandidateId에 해당하는 코스 장소를 전부 삭제한다', async () => {
      const repository = new CourseRepository()
      const { manager, placeDeleteQueryBuilder } = createManagerMocks()

      await repository.deleteCourseCandidatePlaces(manager as never, '2')

      expect(placeDeleteQueryBuilder.delete).toHaveBeenCalled()
      expect(placeDeleteQueryBuilder.where).toHaveBeenCalledWith(
        'course_candidate_id = :courseCandidateId',
        { courseCandidateId: '2' },
      )
      expect(placeDeleteQueryBuilder.execute).toHaveBeenCalled()
    })
  })

  describe('countParticipants', () => {
    it('meetingId에 해당하는 참여자 수를 센다', async () => {
      const repository = new CourseRepository()
      const { manager, participantRepository } = createManagerMocks()
      participantRepository.count.mockResolvedValue(3)

      await expect(
        repository.countParticipants(manager as never, '1'),
      ).resolves.toBe(3)
      expect(participantRepository.count).toHaveBeenCalledWith({
        where: { meeting: { id: '1' } },
      })
    })
  })
})
