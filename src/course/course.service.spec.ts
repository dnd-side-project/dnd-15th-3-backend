import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { CourseService } from './course.service'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseCategoryStep } from './entities/course-category-step.entity'
import { MeetingPlaceRecommendation } from './entities/meeting-place-recommendation.entity'
import { PreferenceType } from './enums/preference-type.enum'

function createMeetingWithStatus(status: MeetingStatus): Meeting {
  const meeting = new Meeting()
  meeting.status = status
  return meeting
}

function createParticipant(
  overrides: Partial<MeetingParticipant>,
): MeetingParticipant {
  return Object.assign(new MeetingParticipant(), overrides)
}

function createCandidate(overrides: Partial<CourseCandidate>): CourseCandidate {
  return Object.assign(new CourseCandidate(), overrides)
}

function createService() {
  const dataSource = { transaction: jest.fn() }
  const meetingAccessService = { findParticipant: jest.fn() }
  const voteRepository = {
    getPreferenceSummaries: jest.fn().mockResolvedValue(new Map()),
  }
  const recommendationRepository = {
    findExcludedFromCourse: jest.fn().mockResolvedValue([]),
  }
  const courseCandidateRepository = {
    find: jest.fn(),
    exists: jest.fn(),
    findOne: jest.fn(),
  }
  const commentRepository = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  }
  const courseCandidatePlaceRepository = {
    find: jest.fn().mockResolvedValue([]),
  }
  const placeImageService = {
    getPrimaryImageUrls: jest.fn().mockResolvedValue(new Map()),
  }
  const kakaoWalkingCourseService = { getWalkingCourse: jest.fn() }
  const courseRepository = {
    lockMeeting: jest.fn(),
    deleteCourseCategorySteps: jest.fn().mockResolvedValue(undefined),
    deleteCourseCandidatePlaces: jest.fn().mockResolvedValue(undefined),
  }
  const service = new CourseService(
    dataSource as never,
    meetingAccessService as never,
    voteRepository as never,
    recommendationRepository as never,
    courseCandidateRepository as never,
    commentRepository as never,
    courseCandidatePlaceRepository as never,
    placeImageService as never,
    kakaoWalkingCourseService as never,
    courseRepository as never,
  )

  return {
    service,
    dataSource,
    meetingAccessService,
    voteRepository,
    recommendationRepository,
    courseCandidateRepository,
    commentRepository,
    courseCandidatePlaceRepository,
    placeImageService,
    kakaoWalkingCourseService,
    courseRepository,
  }
}

function createConfirmTransactionMocks() {
  const participantRepository = { findOne: jest.fn() }
  const meetingRepository = {
    save: jest.fn().mockImplementation((value) => value),
  }
  const candidateRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((value) => value),
  }
  const repositories = new Map<unknown, unknown>([
    [MeetingParticipant, participantRepository],
    [Meeting, meetingRepository],
    [CourseCandidate, candidateRepository],
  ])
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  }

  return {
    manager,
    participantRepository,
    meetingRepository,
    candidateRepository,
  }
}

function createAddPlaceTransactionMocks() {
  const participantRepository = { findOne: jest.fn() }
  const meetingRepository = {
    save: jest.fn().mockImplementation((value) => value),
  }
  const candidateRepository = { findOne: jest.fn() }
  const recommendationRepository = { findOne: jest.fn() }
  const placeRepository = {
    find: jest.fn(),
    save: jest.fn().mockImplementation((value) => value),
    create: jest.fn().mockImplementation((value) => value),
  }
  const categoryStepRepository = {
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation((value) => value),
    create: jest.fn().mockImplementation((value) => value),
  }
  const repositories = new Map<unknown, unknown>([
    [MeetingParticipant, participantRepository],
    [Meeting, meetingRepository],
    [CourseCandidate, candidateRepository],
    [MeetingPlaceRecommendation, recommendationRepository],
    [CourseCandidatePlace, placeRepository],
    [CourseCategoryStep, categoryStepRepository],
  ])
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  }

  return {
    manager,
    participantRepository,
    meetingRepository,
    candidateRepository,
    recommendationRepository,
    placeRepository,
    categoryStepRepository,
  }
}

function createUpdatePlacesTransactionMocks() {
  const participantRepository = { findOne: jest.fn() }
  const meetingRepository = {
    save: jest.fn().mockImplementation((value) => value),
  }
  const candidateRepository = { findOne: jest.fn() }
  const recommendationRepository = { find: jest.fn() }
  const placeRepository = {
    save: jest.fn().mockImplementation((value) => value),
    create: jest.fn().mockImplementation((value) => value),
  }
  const categoryStepRepository = {
    save: jest.fn().mockImplementation((value) => value),
    create: jest.fn().mockImplementation((value) => value),
  }
  const repositories = new Map<unknown, unknown>([
    [MeetingParticipant, participantRepository],
    [Meeting, meetingRepository],
    [CourseCandidate, candidateRepository],
    [MeetingPlaceRecommendation, recommendationRepository],
    [CourseCandidatePlace, placeRepository],
    [CourseCategoryStep, categoryStepRepository],
  ])
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  }

  return {
    manager,
    participantRepository,
    meetingRepository,
    candidateRepository,
    recommendationRepository,
    placeRepository,
    categoryStepRepository,
  }
}

function createRecommendation(overrides: {
  id: string
  longitude: number
  latitude: number
  categoryName?: string
  categorySlug?: string
}) {
  return {
    id: overrides.id,
    place: {
      id: `place-${overrides.id}`,
      name: `장소 ${overrides.id}`,
      address: `주소 ${overrides.id}`,
      longitude: overrides.longitude,
      latitude: overrides.latitude,
      category: {
        name: overrides.categoryName ?? '카페',
        slug: overrides.categorySlug ?? 'cafe',
      },
    },
  }
}

function createWalkingCourseResponse(totalTime: number, totalDistance: number) {
  return {
    status: 'OK' as const,
    route: {
      properties: { totalTime, totalDistance },
      legs: [{ properties: { time: totalTime, distance: totalDistance } }],
    },
  }
}

describe('CourseService', () => {
  describe('getCourseCandidates', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.'),
      )

      const promise = service.getCourseCandidates('1', 'bad-token')

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(courseCandidateRepository.find).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])('%s 상태에서는 DB 조회 없이 409를 던진다', async (status) => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(status),
      })

      const promise = service.getCourseCandidates('1', 'token')

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      expect(courseCandidateRepository.find).not.toHaveBeenCalled()
    })

    it('코스 생성 완료 상태면 후보 목록을 순서대로 반환한다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.find.mockResolvedValue([
        { id: '1', order: 1 },
        { id: '2', order: 2 },
      ])

      await expect(service.getCourseCandidates('1', 'token')).resolves.toEqual({
        courseCandidates: [
          { courseCandidateId: '1', order: 1 },
          { courseCandidateId: '2', order: 2 },
        ],
        totalCount: 2,
      })
      expect(courseCandidateRepository.find).toHaveBeenCalledWith({
        where: { meeting: { id: '1' } },
        order: { order: 'ASC' },
      })
    })

    it('코스 생성 완료 상태인데 후보가 없으면 데이터 정합성 오류로 500을 던진다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.find.mockResolvedValue([])

      const promise = service.getCourseCandidates('1', 'token')

      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException)
      await expect(promise).rejects.toThrow(
        '코스 생성이 완료된 모임인데 코스 후보를 찾을 수 없는 데이터 정합성 오류입니다.',
      )
    })
  })

  describe('getCourseDetail', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.'),
      )

      const promise = service.getCourseDetail('1', '2', 'bad-token')

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(courseCandidateRepository.find).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
    ])('%s 상태에서는 DB 조회 없이 409를 던진다', async (status) => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        courseCandidatePlaceRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(status),
      })

      const promise = service.getCourseDetail('1', '2', 'token')

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      expect(courseCandidateRepository.find).not.toHaveBeenCalled()
      expect(courseCandidatePlaceRepository.find).not.toHaveBeenCalled()
    })

    it.each([MeetingStatus.CourseGenerated, MeetingStatus.CourseConfirmed])(
      '%s 상태면 코스 후보를 조회한다',
      async (status) => {
        const { service, meetingAccessService, courseCandidateRepository } =
          createService()
        meetingAccessService.findParticipant.mockResolvedValue({
          id: '1',
          meeting: createMeetingWithStatus(status),
        })
        courseCandidateRepository.findOne.mockResolvedValue(null)

        const promise = service.getCourseDetail('1', '2', 'token')

        await expect(promise).rejects.toBeInstanceOf(NotFoundException)
        expect(courseCandidateRepository.findOne).toHaveBeenCalledWith({
          where: { id: '2', meeting: { id: '1' } },
        })
      },
    )

    it('코스 후보가 해당 모임 소속이 아니면 404를 던지고 경로를 조회하지 않는다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        courseCandidatePlaceRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.findOne.mockResolvedValue(null)

      const promise = service.getCourseDetail('1', '2', 'token')

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(courseCandidatePlaceRepository.find).not.toHaveBeenCalled()
    })

    it('코스 후보는 있는데 경로가 하나도 없으면 데이터 정합성 오류로 500을 던진다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        courseCandidatePlaceRepository,
        placeImageService,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      courseCandidatePlaceRepository.find.mockResolvedValue([])

      const promise = service.getCourseDetail('1', '2', 'token')

      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException)
      await expect(promise).rejects.toThrow(
        '코스 후보가 존재하는데 코스 경로를 찾을 수 없는 데이터 정합성 오류입니다.',
      )
      expect(placeImageService.getPrimaryImageUrls).not.toHaveBeenCalled()
    })

    it.each([MeetingStatus.CourseGenerated, MeetingStatus.CourseConfirmed])(
      '%s 상태면 경로와 총 이동 거리를 순서대로 반환하고, 여러 구간의 거리를 합산하며, 마지막 장소의 이동 시간은 null로 반환한다',
      async (status) => {
        const {
          service,
          meetingAccessService,
          courseCandidateRepository,
          courseCandidatePlaceRepository,
          placeImageService,
        } = createService()
        meetingAccessService.findParticipant.mockResolvedValue({
          id: '1',
          meeting: createMeetingWithStatus(status),
        })
        courseCandidateRepository.findOne.mockResolvedValue(
          createCandidate({ id: '2', name: '뚜벅이 코스' }),
        )
        courseCandidatePlaceRepository.find.mockResolvedValue([
          {
            order: 1,
            travelTimeToNext: 480,
            distanceToNextMeters: 600,
            meetingPlaceRecommendation: {
              id: '10',
              place: {
                id: '1',
                name: '성수 카페 모모',
                address: '서울 성동구 성수이로 1',
                longitude: 127.0557,
                latitude: 37.5446,
                category: { name: '카페', slug: 'cafe' },
              },
            },
          },
          {
            order: 2,
            travelTimeToNext: 600,
            distanceToNextMeters: 900,
            meetingPlaceRecommendation: {
              id: '11',
              place: {
                id: '2',
                name: '성수 맛집',
                address: '서울 성동구 성수이로 2',
                longitude: 127.0558,
                latitude: 37.5447,
                category: { name: '음식점', slug: 'restaurant' },
              },
            },
          },
          {
            order: 3,
            travelTimeToNext: null,
            distanceToNextMeters: null,
            meetingPlaceRecommendation: {
              id: '12',
              place: {
                id: '3',
                name: '성수 술집',
                address: '서울 성동구 성수이로 3',
                longitude: 127.0559,
                latitude: 37.5448,
                category: { name: '술집', slug: 'bar' },
              },
            },
          },
        ])
        placeImageService.getPrimaryImageUrls.mockResolvedValue(
          new Map([['1', 'https://signed.example.com/first.jpg']]),
        )

        await expect(
          service.getCourseDetail('1', '2', 'token'),
        ).resolves.toEqual({
          courseName: '뚜벅이 코스',
          totalDistanceKm: 1.5,
          totalCount: 3,
          route: [
            {
              recommendationId: '10',
              placeId: '1',
              order: 1,
              name: '성수 카페 모모',
              category: '카페',
              categorySlug: 'cafe',
              address: '서울 성동구 성수이로 1',
              primaryImageUrl: 'https://signed.example.com/first.jpg',
              longitude: 127.0557,
              latitude: 37.5446,
              walkDurationToNextMin: 8,
            },
            {
              recommendationId: '11',
              placeId: '2',
              order: 2,
              name: '성수 맛집',
              category: '음식점',
              categorySlug: 'restaurant',
              address: '서울 성동구 성수이로 2',
              primaryImageUrl: null,
              longitude: 127.0558,
              latitude: 37.5447,
              walkDurationToNextMin: 10,
            },
            {
              recommendationId: '12',
              placeId: '3',
              order: 3,
              name: '성수 술집',
              category: '술집',
              categorySlug: 'bar',
              address: '서울 성동구 성수이로 3',
              primaryImageUrl: null,
              longitude: 127.0559,
              latitude: 37.5448,
              walkDurationToNextMin: null,
            },
          ],
        })
        expect(courseCandidatePlaceRepository.find).toHaveBeenCalledWith({
          where: { courseCandidate: { id: '2' } },
          relations: {
            meetingPlaceRecommendation: { place: { category: true } },
          },
          order: { order: 'ASC' },
        })
      },
    )
  })

  describe('getCourseComments', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.'),
      )

      const promise = service.getCourseComments('1', '2', 'bad-token')

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(commentRepository.find).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])('%s 상태에서는 DB 조회 없이 409를 던진다', async (status) => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(status),
      })

      const promise = service.getCourseComments('1', '2', 'token')

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(commentRepository.find).not.toHaveBeenCalled()
    })

    it('코스 후보가 해당 모임 소속이 아니면 404를 던지고 댓글을 조회하지 않는다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(false)

      const promise = service.getCourseComments('1', '2', 'token')

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(courseCandidateRepository.exists).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
      expect(commentRepository.find).not.toHaveBeenCalled()
    })

    it('코스 생성 완료 상태면 댓글을 작성 순서대로 반환하고 내 댓글 여부를 표시한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(true)
      commentRepository.find.mockResolvedValue([
        {
          id: '1',
          content: '여기 코스 좋아요!',
          createdAt: new Date('2026-08-08T12:34:56.000Z'),
          participant: createParticipant({
            id: '1',
            nickname: '모모',
            profileAvatarId: ProfileAvatarId.MomoBlue,
            role: ParticipantRole.Host,
          }),
        },
        {
          id: '2',
          content: '저도요',
          createdAt: new Date('2026-08-08T13:00:00.000Z'),
          participant: createParticipant({
            id: '2',
            nickname: '지니',
            profileAvatarId: ProfileAvatarId.MomoYellow,
            role: ParticipantRole.Member,
          }),
        },
      ])

      await expect(
        service.getCourseComments('1', '2', 'token'),
      ).resolves.toEqual([
        {
          commentId: '1',
          nickname: '모모',
          profileAvatarId: ProfileAvatarId.MomoBlue,
          authorRole: ParticipantRole.Host,
          isMine: true,
          content: '여기 코스 좋아요!',
          createdAt: '2026-08-08T12:34:56.000Z',
        },
        {
          commentId: '2',
          nickname: '지니',
          profileAvatarId: ProfileAvatarId.MomoYellow,
          authorRole: ParticipantRole.Member,
          isMine: false,
          content: '저도요',
          createdAt: '2026-08-08T13:00:00.000Z',
        },
      ])
      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { courseCandidate: { id: '2' } },
        relations: { participant: true },
        order: { createdAt: 'ASC' },
      })
    })

    it('댓글이 하나도 없으면 빈 배열을 반환한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(true)
      commentRepository.find.mockResolvedValue([])

      await expect(
        service.getCourseComments('1', '2', 'token'),
      ).resolves.toEqual([])
    })
  })

  describe('createCourseComment', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.'),
      )

      const promise = service.createCourseComment('1', '2', 'bad-token', {
        content: '좋아요!',
      })

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(commentRepository.save).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])('%s 상태에서는 DB 조회 없이 409를 던진다', async (status) => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(status),
      })

      const promise = service.createCourseComment('1', '2', 'token', {
        content: '좋아요!',
      })

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(commentRepository.save).not.toHaveBeenCalled()
    })

    it('코스 후보가 해당 모임 소속이 아니면 404를 던지고 댓글을 저장하지 않는다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(false)

      const promise = service.createCourseComment('1', '2', 'token', {
        content: '좋아요!',
      })

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(courseCandidateRepository.exists).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
      expect(commentRepository.save).not.toHaveBeenCalled()
    })

    it('검증을 통과하면 댓글을 저장하고 생성된 정보를 반환한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        commentRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(true)
      commentRepository.save.mockResolvedValue({
        id: '1',
        content: '여기 코스 좋아요!',
        createdAt: new Date('2026-08-08T12:34:56.000Z'),
      })

      await expect(
        service.createCourseComment('1', '2', 'token', {
          content: '여기 코스 좋아요!',
        }),
      ).resolves.toEqual({
        commentId: '1',
        content: '여기 코스 좋아요!',
        createdAt: '2026-08-08T12:34:56.000Z',
      })
      expect(commentRepository.create).toHaveBeenCalledWith({
        courseCandidate: { id: '2' },
        participant: { id: '1' },
        content: '여기 코스 좋아요!',
      })
      expect(commentRepository.save).toHaveBeenCalledWith({
        courseCandidate: { id: '2' },
        participant: { id: '1' },
        content: '여기 코스 좋아요!',
      })
    })
  })

  describe('getExcludedPlaces', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const { service, meetingAccessService, recommendationRepository } =
        createService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new UnauthorizedException('모임 참여자 토큰이 유효하지 않습니다.'),
      )

      const promise = service.getExcludedPlaces(
        '1',
        '2',
        'bad-token',
        undefined,
      )

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(
        recommendationRepository.findExcludedFromCourse,
      ).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])('%s 상태에서는 DB 조회 없이 409를 던진다', async (status) => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        recommendationRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(status),
      })

      const promise = service.getExcludedPlaces('1', '2', 'token', undefined)

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      expect(courseCandidateRepository.exists).not.toHaveBeenCalled()
      expect(
        recommendationRepository.findExcludedFromCourse,
      ).not.toHaveBeenCalled()
    })

    it('코스 후보가 해당 모임 소속이 아니면 404를 던지고 장소를 조회하지 않는다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        recommendationRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(false)

      const promise = service.getExcludedPlaces('1', '2', 'token', undefined)

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(
        recommendationRepository.findExcludedFromCourse,
      ).not.toHaveBeenCalled()
    })

    it('제외된 장소가 없으면 투표/이미지 조회 없이 빈 목록을 반환한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        voteRepository,
        placeImageService,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(true)

      await expect(
        service.getExcludedPlaces('1', '2', 'token', undefined),
      ).resolves.toEqual({ items: [], totalCount: 0, appliedCategory: null })
      expect(voteRepository.getPreferenceSummaries).toHaveBeenCalledWith(
        [],
        '1',
      )
      expect(placeImageService.getPrimaryImageUrls).toHaveBeenCalledWith([])
    })

    it('카테고리 필터를 저장소 조회에 그대로 전달한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        recommendationRepository,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(true)

      await service.getExcludedPlaces('1', '2', 'token', CategorySlug.Cafe)

      expect(
        recommendationRepository.findExcludedFromCourse,
      ).toHaveBeenCalledWith('1', '2', CategorySlug.Cafe)
    })

    it('제외된 장소를 좋아요/싫어요·대표 이미지와 함께 반환한다', async () => {
      const {
        service,
        meetingAccessService,
        courseCandidateRepository,
        recommendationRepository,
        voteRepository,
        placeImageService,
      } = createService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: '1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      courseCandidateRepository.exists.mockResolvedValue(true)
      recommendationRepository.findExcludedFromCourse.mockResolvedValue([
        {
          id: '1',
          place: {
            id: '1',
            name: '성수 카페 모모',
            address: '서울 성동구 성수이로 1',
            category: { name: '카페', slug: 'cafe' },
          },
        },
      ])
      voteRepository.getPreferenceSummaries.mockResolvedValue(
        new Map([
          [
            '1',
            {
              likeCount: 3,
              dislikeCount: 1,
              myPreference: PreferenceType.Like,
            },
          ],
        ]),
      )
      placeImageService.getPrimaryImageUrls.mockResolvedValue(
        new Map([['1', 'https://signed.example.com/first.jpg']]),
      )

      await expect(
        service.getExcludedPlaces('1', '2', 'token', undefined),
      ).resolves.toEqual({
        items: [
          {
            recommendationId: '1',
            category: '카페',
            categorySlug: 'cafe',
            name: '성수 카페 모모',
            address: '서울 성동구 성수이로 1',
            primaryImageUrl: 'https://signed.example.com/first.jpg',
            likeCount: 3,
            dislikeCount: 1,
            myPreference: PreferenceType.Like,
          },
        ],
        totalCount: 1,
        appliedCategory: null,
      })
      expect(voteRepository.getPreferenceSummaries).toHaveBeenCalledWith(
        ['1'],
        '1',
      )
    })
  })

  describe('confirmCourse', () => {
    it('accessToken이 빈 문자열이면 트랜잭션 없이 401을 던진다', async () => {
      const { service, dataSource } = createService()

      const promise = service.confirmCourse('1', '2', '', {})

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('참여자를 찾지 못하면 401을 던지고 아무것도 변경하지 않는다', async () => {
      const { service, dataSource } = createService()
      const { manager, participantRepository, candidateRepository } =
        createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(null)

      const promise = service.confirmCourse('1', '2', 'token', {})

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(candidateRepository.save).not.toHaveBeenCalled()
    })

    it('참여자가 방장이 아니면 403을 던지고 아무것도 변경하지 않는다', async () => {
      const { service, dataSource } = createService()
      const { manager, participantRepository, candidateRepository } =
        createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Member }),
      )

      const promise = service.confirmCourse('1', '2', 'token', {})

      await expect(promise).rejects.toBeInstanceOf(ForbiddenException)
      await expect(promise).rejects.toThrow('방장만 코스를 확정할 수 있습니다.')
      expect(candidateRepository.save).not.toHaveBeenCalled()
    })

    it('모임을 찾지 못하면 404를 던지고 후보를 조회하지 않는다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const { manager, participantRepository, candidateRepository } =
        createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(null)

      const promise = service.confirmCourse('1', '2', 'token', {})

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('모임을 찾을 수 없습니다.')
      expect(candidateRepository.findOne).not.toHaveBeenCalled()
      expect(candidateRepository.save).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])(
      '모임이 %s 상태이면 409를 던지고 후보를 조회하지 않는다',
      async (status) => {
        const { service, dataSource, courseRepository } = createService()
        const { manager, participantRepository, candidateRepository } =
          createConfirmTransactionMocks()
        dataSource.transaction.mockImplementation((callback: never) =>
          (callback as (manager: unknown) => unknown)(manager),
        )
        participantRepository.findOne.mockResolvedValue(
          createParticipant({ role: ParticipantRole.Host }),
        )
        courseRepository.lockMeeting.mockResolvedValue(
          createMeetingWithStatus(status),
        )

        const promise = service.confirmCourse('1', '2', 'token', {})

        await expect(promise).rejects.toBeInstanceOf(ConflictException)
        expect(candidateRepository.findOne).not.toHaveBeenCalled()
      },
    )

    it('코스 후보가 해당 모임 소속이 아니면 404를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const { manager, participantRepository, candidateRepository } =
        createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(null)

      const promise = service.confirmCourse('1', '2', 'token', {})

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
    })

    it('검증을 통과하면 코스 후보를 확정하고 모임 상태를 전환한다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        meetingRepository,
        candidateRepository,
      } = createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      const meeting = createMeetingWithStatus(MeetingStatus.CourseGenerated)
      courseRepository.lockMeeting.mockResolvedValue(meeting)
      const candidate = createCandidate({ id: '2', isSelected: false })
      candidateRepository.findOne.mockResolvedValue(candidate)

      await expect(
        service.confirmCourse('1', '2', 'token', {}),
      ).resolves.toEqual({
        status: MeetingStatus.CourseConfirmed,
        confirmedCourseCandidateId: '2',
      })
      expect(participantRepository.findOne).toHaveBeenCalledWith({
        where: { meeting: { id: '1' }, accessToken: 'token' },
      })
      expect(courseRepository.lockMeeting).toHaveBeenCalledWith(manager, '1')
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
      expect(candidate.isSelected).toBe(true)
      expect(candidateRepository.save).toHaveBeenCalledWith(candidate)
      expect(meeting.status).toBe(MeetingStatus.CourseConfirmed)
      expect(meeting.courseImageKey).toBeUndefined()
      expect(meetingRepository.save).toHaveBeenCalledWith(meeting)
    })

    it('courseImageKey가 있으면 모임에 반영하고 업로드 시각을 기록한다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        meetingRepository,
        candidateRepository,
      } = createConfirmTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      const meeting = createMeetingWithStatus(MeetingStatus.CourseGenerated)
      courseRepository.lockMeeting.mockResolvedValue(meeting)
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', isSelected: false }),
      )

      await service.confirmCourse('1', '2', 'token', {
        courseImageKey: 'course-cards/1/5.png',
      })

      expect(meeting.courseImageKey).toBe('course-cards/1/5.png')
      expect(meeting.courseImageUploadedAt).toBeInstanceOf(Date)
      expect(meetingRepository.save).toHaveBeenCalledWith(meeting)
    })
  })

  describe('addCoursePlace', () => {
    it('accessToken이 빈 문자열이면 트랜잭션 없이 401을 던진다', async () => {
      const { service, dataSource } = createService()

      const promise = service.addCoursePlace('1', '2', '', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('참여자를 찾지 못하면 401을 던지고 아무것도 변경하지 않는다', async () => {
      const { service, dataSource } = createService()
      const { manager, participantRepository, placeRepository } =
        createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(null)

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(placeRepository.save).not.toHaveBeenCalled()
    })

    it('참여자가 방장이 아니면 403을 던지고 아무것도 변경하지 않는다', async () => {
      const { service, dataSource } = createService()
      const { manager, participantRepository, placeRepository } =
        createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Member }),
      )

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(ForbiddenException)
      await expect(promise).rejects.toThrow('방장만 코스를 편집할 수 있습니다.')
      expect(placeRepository.save).not.toHaveBeenCalled()
    })

    it('모임을 찾지 못하면 404를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const { manager, participantRepository } =
        createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(null)

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('모임을 찾을 수 없습니다.')
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])(
      '모임이 %s 상태이면 409를 던지고 코스 후보를 조회하지 않는다',
      async (status) => {
        const { service, dataSource, courseRepository } = createService()
        const { manager, participantRepository, candidateRepository } =
          createAddPlaceTransactionMocks()
        dataSource.transaction.mockImplementation((callback: never) =>
          (callback as (manager: unknown) => unknown)(manager),
        )
        participantRepository.findOne.mockResolvedValue(
          createParticipant({ role: ParticipantRole.Host }),
        )
        courseRepository.lockMeeting.mockResolvedValue(
          createMeetingWithStatus(status),
        )

        const promise = service.addCoursePlace('1', '2', 'token', {
          recommendationId: '20',
        })

        await expect(promise).rejects.toBeInstanceOf(ConflictException)
        expect(candidateRepository.findOne).not.toHaveBeenCalled()
      },
    )

    it('코스 후보가 해당 모임 소속이 아니면 404를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(null)

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(recommendationRepository.findOne).not.toHaveBeenCalled()
    })

    it('장소 추천을 찾지 못하면 404를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.findOne.mockResolvedValue(null)

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('장소 추천을 찾을 수 없습니다.')
      expect(placeRepository.find).not.toHaveBeenCalled()
    })

    it('코스 경로가 하나도 없으면 데이터 정합성 오류로 500을 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.findOne.mockResolvedValue(
        createRecommendation({ id: '20', longitude: 127.06, latitude: 37.55 }),
      )
      placeRepository.find.mockResolvedValue([])

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException)
      await expect(promise).rejects.toThrow(
        '코스 후보가 존재하는데 코스 경로를 찾을 수 없는 데이터 정합성 오류입니다.',
      )
    })

    it('이미 코스에 포함된 장소면 409를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.findOne.mockResolvedValue(
        createRecommendation({ id: '20', longitude: 127.06, latitude: 37.55 }),
      )
      placeRepository.find.mockResolvedValue([
        {
          order: 1,
          meetingPlaceRecommendation: createRecommendation({
            id: '20',
            longitude: 127.0,
            latitude: 37.5,
          }),
        },
      ])

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      await expect(promise).rejects.toThrow('이미 코스에 포함된 장소입니다.')
    })

    it('코스에 이미 최대 개수만큼 장소가 있으면 409를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.findOne.mockResolvedValue(
        createRecommendation({ id: '20', longitude: 127.06, latitude: 37.55 }),
      )
      placeRepository.find.mockResolvedValue(
        Array.from({ length: 6 }, (_, index) => ({
          order: index + 1,
          meetingPlaceRecommendation: createRecommendation({
            id: `${index + 1}`,
            longitude: 127.0 + index,
            latitude: 37.5 + index,
          }),
        })),
      )

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(ConflictException)
      await expect(promise).rejects.toThrow(
        '코스에 이미 장소가 6개 있어서 추가할 수 없습니다.',
      )
    })

    it('카카오 API 호출이 실패하면 클라이언트에는 일반화된 500을 반환한다', async () => {
      const {
        service,
        dataSource,
        kakaoWalkingCourseService,
        courseRepository,
      } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.findOne.mockResolvedValue(
        createRecommendation({ id: '20', longitude: 127.06, latitude: 37.55 }),
      )
      placeRepository.find.mockResolvedValue([
        {
          order: 1,
          meetingPlaceRecommendation: createRecommendation({
            id: '10',
            longitude: 127.0,
            latitude: 37.5,
          }),
        },
      ])
      const kakaoError = new ServiceUnavailableException(
        '카카오 REST API 키가 설정되지 않았습니다.',
      )
      kakaoWalkingCourseService.getWalkingCourse.mockRejectedValue(kakaoError)
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation()

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException)
      await expect(promise).rejects.toThrow(
        '코스를 편집하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      )
      await expect(promise).rejects.not.toThrow(
        '카카오 REST API 키가 설정되지 않았습니다.',
      )
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        kakaoError.stack,
      )
      expect(placeRepository.save).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('카카오 응답 status가 OK가 아니면 클라이언트에는 일반화된 500을 반환한다', async () => {
      const {
        service,
        dataSource,
        kakaoWalkingCourseService,
        courseRepository,
      } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.findOne.mockResolvedValue(
        createRecommendation({ id: '20', longitude: 127.06, latitude: 37.55 }),
      )
      placeRepository.find.mockResolvedValue([
        {
          order: 1,
          meetingPlaceRecommendation: createRecommendation({
            id: '10',
            longitude: 127.0,
            latitude: 37.5,
          }),
        },
      ])
      kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue({
        status: 'ROUTE_RESULT_NOT_FOUND',
      })
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation()

      const promise = service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException)
      await expect(promise).rejects.toThrow(
        '코스를 편집하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      )
      expect(errorSpy).toHaveBeenCalled()
      expect(placeRepository.save).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('검증을 통과하면 마지막 장소의 이동 시간·거리를 갱신하고 새 장소를 코스 맨 뒤에 추가하며 카테고리 스텝과 코스 버전을 갱신한다', async () => {
      const {
        service,
        dataSource,
        kakaoWalkingCourseService,
        courseRepository,
      } = createService()
      const {
        manager,
        participantRepository,
        meetingRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
        categoryStepRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      const meeting = createMeetingWithStatus(MeetingStatus.CourseGenerated)
      meeting.courseVersion = 3
      courseRepository.lockMeeting.mockResolvedValue(meeting)
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      const newRecommendation = createRecommendation({
        id: '20',
        longitude: 127.1,
        latitude: 37.51,
        categoryName: '음식점',
        categorySlug: 'restaurant',
      })
      recommendationRepository.findOne.mockResolvedValue(newRecommendation)
      const lastStep = {
        order: 1,
        travelTimeToNext: null,
        distanceToNextMeters: null,
        meetingPlaceRecommendation: createRecommendation({
          id: '10',
          longitude: 127.0,
          latitude: 37.5,
        }),
      }
      placeRepository.find.mockResolvedValue([lastStep])
      categoryStepRepository.find.mockResolvedValue([{ order: 2 }])
      kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue(
        createWalkingCourseResponse(300, 450),
      )

      const result = await service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      expect(participantRepository.findOne).toHaveBeenCalledWith({
        where: { meeting: { id: '1' }, accessToken: 'token' },
      })
      expect(courseRepository.lockMeeting).toHaveBeenCalledWith(manager, '1')
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
      expect(kakaoWalkingCourseService.getWalkingCourse).toHaveBeenCalledWith({
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        start_x: '127',
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        start_y: '37.5',
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        end_x: '127.1',
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        end_y: '37.51',
      })
      expect(lastStep.travelTimeToNext).toBe(300)
      expect(lastStep.distanceToNextMeters).toBe(450)
      expect(placeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseCandidate: { id: '2' },
          order: 2,
        }),
      )
      expect(placeRepository.save).toHaveBeenCalledWith([
        lastStep,
        expect.objectContaining({
          courseCandidate: { id: '2' },
          order: 2,
          travelTimeToNext: null,
          distanceToNextMeters: null,
        }),
      ])
      expect(categoryStepRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          meeting: { id: '1' },
          category: newRecommendation.place.category,
          order: 3,
        }),
      )
      expect(meeting.courseVersion).toBe(4)
      expect(meetingRepository.save).toHaveBeenCalledWith(meeting)
      expect(result).toEqual({
        courseName: '뚜벅이 코스',
        totalDistanceKm: 0.5,
        totalCount: 2,
        route: [
          {
            recommendationId: '10',
            placeId: 'place-10',
            order: 1,
            name: '장소 10',
            category: '카페',
            categorySlug: 'cafe',
            address: '주소 10',
            primaryImageUrl: null,
            longitude: 127.0,
            latitude: 37.5,
            walkDurationToNextMin: 5,
          },
          {
            recommendationId: '20',
            placeId: 'place-20',
            order: 2,
            name: '장소 20',
            category: '음식점',
            categorySlug: 'restaurant',
            address: '주소 20',
            primaryImageUrl: null,
            longitude: 127.1,
            latitude: 37.51,
            walkDurationToNextMin: null,
          },
        ],
      })
    })

    it('기존 카테고리 스텝이 없으면 1번부터 시작한다', async () => {
      const {
        service,
        dataSource,
        kakaoWalkingCourseService,
        courseRepository,
      } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
        categoryStepRepository,
      } = createAddPlaceTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.findOne.mockResolvedValue(
        createRecommendation({ id: '20', longitude: 127.1, latitude: 37.51 }),
      )
      placeRepository.find.mockResolvedValue([
        {
          order: 1,
          travelTimeToNext: null,
          distanceToNextMeters: null,
          meetingPlaceRecommendation: createRecommendation({
            id: '10',
            longitude: 127.0,
            latitude: 37.5,
          }),
        },
      ])
      categoryStepRepository.find.mockResolvedValue([])
      kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue(
        createWalkingCourseResponse(300, 450),
      )

      await service.addCoursePlace('1', '2', 'token', {
        recommendationId: '20',
      })

      expect(categoryStepRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ order: 1 }),
      )
    })
  })

  describe('updateCoursePlaces', () => {
    it('accessToken이 빈 문자열이면 트랜잭션 없이 401을 던진다', async () => {
      const { service, dataSource } = createService()

      const promise = service.updateCoursePlaces('1', '2', '', {
        recommendationIds: ['10', '20'],
      })

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('참여자를 찾지 못하면 401을 던지고 아무것도 변경하지 않는다', async () => {
      const { service, dataSource } = createService()
      const { manager, participantRepository, placeRepository } =
        createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(null)

      const promise = service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10', '20'],
      })

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException)
      expect(placeRepository.save).not.toHaveBeenCalled()
    })

    it('참여자가 방장이 아니면 403을 던지고 아무것도 변경하지 않는다', async () => {
      const { service, dataSource } = createService()
      const { manager, participantRepository, placeRepository } =
        createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Member }),
      )

      const promise = service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10', '20'],
      })

      await expect(promise).rejects.toBeInstanceOf(ForbiddenException)
      await expect(promise).rejects.toThrow('방장만 코스를 편집할 수 있습니다.')
      expect(placeRepository.save).not.toHaveBeenCalled()
    })

    it('모임을 찾지 못하면 404를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const { manager, participantRepository } =
        createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(null)

      const promise = service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10', '20'],
      })

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('모임을 찾을 수 없습니다.')
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
      MeetingStatus.CourseConfirmed,
    ])(
      '모임이 %s 상태이면 409를 던지고 코스 후보를 조회하지 않는다',
      async (status) => {
        const { service, dataSource, courseRepository } = createService()
        const { manager, participantRepository, candidateRepository } =
          createUpdatePlacesTransactionMocks()
        dataSource.transaction.mockImplementation((callback: never) =>
          (callback as (manager: unknown) => unknown)(manager),
        )
        participantRepository.findOne.mockResolvedValue(
          createParticipant({ role: ParticipantRole.Host }),
        )
        courseRepository.lockMeeting.mockResolvedValue(
          createMeetingWithStatus(status),
        )

        const promise = service.updateCoursePlaces('1', '2', 'token', {
          recommendationIds: ['10', '20'],
        })

        await expect(promise).rejects.toBeInstanceOf(ConflictException)
        expect(candidateRepository.findOne).not.toHaveBeenCalled()
      },
    )

    it('코스 후보가 해당 모임 소속이 아니면 404를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
      } = createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(null)

      const promise = service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10', '20'],
      })

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('코스 후보를 찾을 수 없습니다.')
      expect(recommendationRepository.find).not.toHaveBeenCalled()
    })

    it('요청한 장소 추천 중 존재하지 않는 것이 있으면 404를 던진다', async () => {
      const { service, dataSource, courseRepository } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      // 10만 찾아지고 20은 존재하지 않는 상황
      recommendationRepository.find.mockResolvedValue([
        createRecommendation({ id: '10', longitude: 127.0, latitude: 37.5 }),
      ])

      const promise = service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10', '20'],
      })

      await expect(promise).rejects.toBeInstanceOf(NotFoundException)
      await expect(promise).rejects.toThrow('장소 추천을 찾을 수 없습니다.')
      expect(placeRepository.save).not.toHaveBeenCalled()
    })

    it('카카오 API 호출이 실패하면 클라이언트에는 일반화된 500을 반환한다', async () => {
      const {
        service,
        dataSource,
        kakaoWalkingCourseService,
        courseRepository,
      } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.find.mockResolvedValue([
        createRecommendation({ id: '10', longitude: 127.0, latitude: 37.5 }),
        createRecommendation({ id: '20', longitude: 127.1, latitude: 37.51 }),
      ])
      kakaoWalkingCourseService.getWalkingCourse.mockRejectedValue(
        new ServiceUnavailableException(
          '카카오 REST API 키가 설정되지 않았습니다.',
        ),
      )
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation()

      const promise = service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10', '20'],
      })

      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException)
      await expect(promise).rejects.toThrow(
        '코스를 편집하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      )
      expect(errorSpy).toHaveBeenCalled()
      expect(placeRepository.save).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('카카오 응답 status가 OK가 아니면 클라이언트에는 일반화된 500을 반환한다', async () => {
      const {
        service,
        dataSource,
        kakaoWalkingCourseService,
        courseRepository,
      } = createService()
      const {
        manager,
        participantRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
      } = createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      courseRepository.lockMeeting.mockResolvedValue(
        createMeetingWithStatus(MeetingStatus.CourseGenerated),
      )
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      recommendationRepository.find.mockResolvedValue([
        createRecommendation({ id: '10', longitude: 127.0, latitude: 37.5 }),
        createRecommendation({ id: '20', longitude: 127.1, latitude: 37.51 }),
      ])
      kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue({
        status: 'ROUTE_RESULT_NOT_FOUND',
      })
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation()

      const promise = service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10', '20'],
      })

      await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException)
      expect(errorSpy).toHaveBeenCalled()
      expect(placeRepository.save).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('검증을 통과하면 기존 장소·카테고리 스텝을 전부 삭제하고 요청 순서대로 다시 채우며 코스 버전을 한 번만 올린다', async () => {
      const {
        service,
        dataSource,
        kakaoWalkingCourseService,
        courseRepository,
      } = createService()
      const {
        manager,
        participantRepository,
        meetingRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
        categoryStepRepository,
      } = createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      const meeting = createMeetingWithStatus(MeetingStatus.CourseGenerated)
      meeting.courseVersion = 5
      courseRepository.lockMeeting.mockResolvedValue(meeting)
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      const recommendation10 = createRecommendation({
        id: '10',
        longitude: 127.0,
        latitude: 37.5,
        categoryName: '카페',
        categorySlug: 'cafe',
      })
      const recommendation20 = createRecommendation({
        id: '20',
        longitude: 127.1,
        latitude: 37.51,
        categoryName: '음식점',
        categorySlug: 'restaurant',
      })
      recommendationRepository.find.mockResolvedValue([
        recommendation20,
        recommendation10,
      ])
      kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue(
        createWalkingCourseResponse(300, 450),
      )

      const result = await service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10', '20'],
      })

      expect(kakaoWalkingCourseService.getWalkingCourse).toHaveBeenCalledTimes(
        1,
      )
      expect(kakaoWalkingCourseService.getWalkingCourse).toHaveBeenCalledWith({
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        start_x: '127',
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        start_y: '37.5',
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        end_x: '127.1',
        // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
        end_y: '37.51',
      })
      expect(courseRepository.deleteCourseCandidatePlaces).toHaveBeenCalledWith(
        manager,
        '2',
      )
      expect(courseRepository.deleteCourseCategorySteps).toHaveBeenCalledWith(
        manager,
        '1',
      )
      expect(placeRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          order: 1,
          travelTimeToNext: 300,
          distanceToNextMeters: 450,
        }),
        expect.objectContaining({
          order: 2,
          travelTimeToNext: null,
          distanceToNextMeters: null,
        }),
      ])
      expect(categoryStepRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          order: 1,
          category: recommendation10.place.category,
        }),
        expect.objectContaining({
          order: 2,
          category: recommendation20.place.category,
        }),
      ])
      expect(meeting.courseVersion).toBe(6)
      expect(meetingRepository.save).toHaveBeenCalledWith(meeting)
      expect(result).toEqual({
        courseName: '뚜벅이 코스',
        totalDistanceKm: 0.5,
        totalCount: 2,
        route: [
          {
            recommendationId: '10',
            placeId: 'place-10',
            order: 1,
            name: '장소 10',
            category: '카페',
            categorySlug: 'cafe',
            address: '주소 10',
            primaryImageUrl: null,
            longitude: 127.0,
            latitude: 37.5,
            walkDurationToNextMin: 5,
          },
          {
            recommendationId: '20',
            placeId: 'place-20',
            order: 2,
            name: '장소 20',
            category: '음식점',
            categorySlug: 'restaurant',
            address: '주소 20',
            primaryImageUrl: null,
            longitude: 127.1,
            latitude: 37.51,
            walkDurationToNextMin: null,
          },
        ],
      })
    })

    it('수정한 장소가 1개면 카카오 API를 호출하지 않고 이동 시간·거리 없이 저장한다', async () => {
      const {
        service,
        dataSource,
        kakaoWalkingCourseService,
        courseRepository,
      } = createService()
      const {
        manager,
        participantRepository,
        meetingRepository,
        candidateRepository,
        recommendationRepository,
        placeRepository,
        categoryStepRepository,
      } = createUpdatePlacesTransactionMocks()
      dataSource.transaction.mockImplementation((callback: never) =>
        (callback as (manager: unknown) => unknown)(manager),
      )
      participantRepository.findOne.mockResolvedValue(
        createParticipant({ role: ParticipantRole.Host }),
      )
      const meeting = createMeetingWithStatus(MeetingStatus.CourseGenerated)
      meeting.courseVersion = 1
      courseRepository.lockMeeting.mockResolvedValue(meeting)
      candidateRepository.findOne.mockResolvedValue(
        createCandidate({ id: '2', name: '뚜벅이 코스' }),
      )
      const recommendation10 = createRecommendation({
        id: '10',
        longitude: 127.0,
        latitude: 37.5,
      })
      recommendationRepository.find.mockResolvedValue([recommendation10])

      const result = await service.updateCoursePlaces('1', '2', 'token', {
        recommendationIds: ['10'],
      })

      expect(kakaoWalkingCourseService.getWalkingCourse).not.toHaveBeenCalled()
      expect(placeRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          order: 1,
          travelTimeToNext: null,
          distanceToNextMeters: null,
        }),
      ])
      expect(categoryStepRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          order: 1,
          category: recommendation10.place.category,
        }),
      ])
      expect(meeting.courseVersion).toBe(2)
      expect(meetingRepository.save).toHaveBeenCalledWith(meeting)
      expect(result).toEqual({
        courseName: '뚜벅이 코스',
        totalDistanceKm: 0,
        totalCount: 1,
        route: [
          {
            recommendationId: '10',
            placeId: 'place-10',
            order: 1,
            name: '장소 10',
            category: '카페',
            categorySlug: 'cafe',
            address: '주소 10',
            primaryImageUrl: null,
            longitude: 127.0,
            latitude: 37.5,
            walkDurationToNextMin: null,
          },
        ],
      })
    })
  })
})
