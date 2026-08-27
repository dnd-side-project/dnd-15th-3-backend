import type { ConfigService } from '@nestjs/config'
import { Category } from 'src/category/entities/category.entity'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import type { Env } from 'src/config/env'
import { CourseCandidate } from 'src/course/entities/course-candidate.entity'
import { CourseCandidatePlace } from 'src/course/entities/course-candidate-place.entity'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { PreferenceType } from 'src/course/enums/preference-type.enum'
import type { MeetingPlaceRecommendationVoteRepository } from 'src/course/meeting-place-recommendation-vote.repository'
import { PlaceSyncJob } from 'src/place/entities/place-sync-job.entity'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import * as placeRepositoryModule from 'src/place/place.repository'
import { User } from 'src/user/entities/user.entity'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { In, type Repository } from 'typeorm'
import type { MeetingAccessService } from './access/meeting-access.service'
import { Meeting } from './entities/meeting.entity'
import { MeetingLocation } from './entities/meeting-location.entity'
import { MeetingParticipant } from './entities/meeting-participant.entity'
import { MeetingType } from './entities/meeting-type.entity'
import { MeetingStatus } from './enums/meeting-status.enum'
import { MeetingTypeCode } from './enums/meeting-type-code.enum'
import { ParticipantRole } from './enums/participant-role.enum'
import { MeetingException } from './exception/meeting.exception'
import { MeetingErrorCode } from './exception/meeting-error-code'
import { MeetingService } from './meeting.service'
import type {
  CreateMeetingRequest,
  InvitationPreviewRequest,
  JoinMeetingRequest,
  UpdateCoursePlanRequest,
} from './schema/meeting-request.schema'

function createMeetingWithStatus(status: MeetingStatus): Meeting {
  const meeting = new Meeting()
  meeting.status = status
  return meeting
}

const request: CreateMeetingRequest = {
  meetingTypeCode: MeetingTypeCode.Social,
  name: '성수 모임',
  date: '2026-08-23',
  time: '12:00',
  firstMeetingLocation: {
    displayName: '강남역',
    address: '서울 강남구',
    latitude: 37.4979,
    longitude: 127.0276,
    externalAddressId: 'kakao-address-1',
  },
  categorySlugs: [CategorySlug.Cafe],
  host: {
    userKey: 'device-1',
    nickname: '모모',
    profileAvatarId: ProfileAvatarId.MomoBlue,
  },
}

function createMeetingService() {
  const config = {
    get: jest.fn().mockReturnValue('https://momo.example/invite'),
  }
  const placeSyncService = {
    createJobs: jest.fn().mockResolvedValue(undefined),
  }
  const mediaService = {
    storePublicImage: jest.fn(),
    getPublicUrl: jest.fn(
      (objectKey: string) => `https://media.example/o/${objectKey}`,
    ),
    downloadPublicImage: jest.fn(),
    discardStoredImage: jest.fn().mockResolvedValue(undefined),
  }
  const participantRepository = { findOne: jest.fn(), find: jest.fn() }
  const placeRepository = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  }
  const recommendationRepository = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((value) => value),
    save: jest.fn(),
    exists: jest.fn(),
  }
  const dataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  }
  const meetingRepository = {
    findOne: jest.fn(),
    exists: jest.fn(),
  }
  const courseCandidateRepository = {
    findOne: jest.fn(),
  }
  const courseCandidatePlaceRepository = {
    find: jest.fn(),
  }
  const voteRepository = {
    applyPreference: jest.fn(),
    getPreferenceSummaries: jest.fn().mockResolvedValue(new Map()),
  }
  const meetingAccessService = {
    findParticipant: jest.fn(),
  }
  const placeSearchRepository = {
    findSimilar: jest.fn(),
  }
  const placePhotoService = {
    findPreviewPhotos: jest.fn().mockResolvedValue(new Map()),
  }
  const placeLiveDataService = {
    resolvePlace: jest.fn().mockImplementation((place) =>
      Promise.resolve({
        ...place,
        source: place.source ?? PlaceSource.Google,
        providerPlaceId: place.providerPlaceId ?? null,
        roadAddress: place.roadAddress ?? null,
        phone: place.phone ?? null,
        placeUrl: place.placeUrl ?? null,
        previewUrl: place.previewUrl ?? null,
      }),
    ),
    resolvePlaces: jest.fn().mockImplementation((places) =>
      Promise.resolve(
        new Map(
          places.map((place) => [
            place.id,
            {
              ...place,
              source: place.source ?? PlaceSource.Google,
              providerPlaceId: place.providerPlaceId ?? null,
              roadAddress: place.roadAddress ?? null,
              phone: place.phone ?? null,
              placeUrl: place.placeUrl ?? null,
              previewUrl: place.previewUrl ?? null,
            },
          ]),
        ),
      ),
    ),
    searchKakao: jest.fn(),
  }
  const questionnaireService = {
    restartAfterMeetingDetailsChange: jest.fn().mockResolvedValue(undefined),
  }

  const service = new MeetingService(
    config as unknown as ConfigService<Env, true>,
    dataSource as never,
    mediaService as never,
    participantRepository as never,
    placeRepository as never,
    recommendationRepository as never,
    meetingRepository as unknown as Repository<Meeting>,
    courseCandidateRepository as unknown as Repository<CourseCandidate>,
    courseCandidatePlaceRepository as unknown as Repository<CourseCandidatePlace>,
    voteRepository as unknown as MeetingPlaceRecommendationVoteRepository,
    meetingAccessService as unknown as MeetingAccessService,
    placeSearchRepository as never,
    placePhotoService as never,
    placeLiveDataService as never,
    questionnaireService as never,
  )

  return {
    service,
    config,
    placeSyncService,
    mediaService,
    participantRepository,
    placeRepository,
    recommendationRepository,
    dataSource,
    meetingRepository,
    courseCandidateRepository,
    courseCandidatePlaceRepository,
    voteRepository,
    meetingAccessService,
    placeSearchRepository,
    placePhotoService,
    placeLiveDataService,
    questionnaireService,
  }
}

function setupMeetingDetailsUpdate() {
  const context = createMeetingService()
  const currentMeetingType = Object.assign(new MeetingType(), {
    id: 'type-1',
    code: MeetingTypeCode.Social,
    name: '친목',
  })
  const nextMeetingType = Object.assign(new MeetingType(), {
    id: 'type-2',
    code: MeetingTypeCode.DatingHobby,
    name: '데이트·취미',
  })
  const meeting = Object.assign(new Meeting(), {
    id: 'meeting-1',
    status: MeetingStatus.RecommendationCollecting,
    name: '기존 모임',
    date: '2026-08-23',
    time: '12:00:00',
    meetingType: currentMeetingType,
  })
  const participant = Object.assign(new MeetingParticipant(), {
    id: 'participant-1',
    role: ParticipantRole.Host,
  })
  context.meetingAccessService.findParticipant.mockResolvedValue(participant)

  const meetingQueryBuilder = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(meeting),
  }
  const transactionMeetingRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(meetingQueryBuilder),
    save: jest.fn(async (value) => value),
  }
  const meetingTypeRepository = {
    findOne: jest
      .fn()
      .mockImplementation(({ where: { code } }) =>
        Promise.resolve(
          code === MeetingTypeCode.Social
            ? currentMeetingType
            : nextMeetingType,
        ),
      ),
  }
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Meeting) return transactionMeetingRepository
      if (entity === MeetingType) return meetingTypeRepository
      throw new Error('unexpected repository')
    }),
  }
  context.dataSource.transaction.mockImplementation(async (callback) =>
    callback(manager),
  )

  return {
    ...context,
    currentMeetingType,
    nextMeetingType,
    meeting,
    participant,
    meetingQueryBuilder,
    transactionMeetingRepository,
    meetingTypeRepository,
    manager,
  }
}

describe('MeetingService', () => {
  describe('updateMeetingDetails', () => {
    it('모임 기본 정보 전체를 잠금 트랜잭션에서 변경하고 질문지를 재생성한다', async () => {
      const {
        service,
        dataSource,
        meeting,
        meetingQueryBuilder,
        transactionMeetingRepository,
        questionnaireService,
        manager,
        nextMeetingType,
      } = setupMeetingDetailsUpdate()

      await expect(
        service.updateMeetingDetails('meeting-1', 'host-token', {
          meetingTypeCode: MeetingTypeCode.DatingHobby,
          name: '저녁 모임',
          date: '2026-09-10',
          time: '18:30',
        }),
      ).resolves.toEqual({
        meetingId: 'meeting-1',
        name: '저녁 모임',
        date: '2026-09-10',
        time: '18:30',
        meetingTypeCode: MeetingTypeCode.DatingHobby,
        meetingType: {
          id: 'type-2',
          code: MeetingTypeCode.DatingHobby,
          name: '데이트·취미',
        },
      })

      expect(dataSource.transaction).toHaveBeenCalledTimes(1)
      expect(meetingQueryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
        'meeting.meetingType',
        'meetingType',
      )
      expect(meetingQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
        undefined,
        ['meeting'],
      )
      expect(transactionMeetingRepository.save).toHaveBeenCalledWith(meeting)
      expect(meeting.meetingType).toBe(nextMeetingType)
      expect(
        questionnaireService.restartAfterMeetingDetailsChange,
      ).toHaveBeenCalledWith(manager, 'meeting-1')
    })

    it.each([
      ['name', { name: '저녁 모임' }],
      ['date', { date: '2026-09-10' }],
      ['time', { time: '18:30' }],
      ['meetingTypeCode', { meetingTypeCode: MeetingTypeCode.DatingHobby }],
    ])('%s 필드만 부분 수정할 수 있다', async (_, input) => {
      const { service, transactionMeetingRepository, questionnaireService } =
        setupMeetingDetailsUpdate()

      await expect(
        service.updateMeetingDetails('meeting-1', 'host-token', input),
      ).resolves.toMatchObject(input)
      expect(transactionMeetingRepository.save).toHaveBeenCalledTimes(1)
      expect(
        questionnaireService.restartAfterMeetingDetailsChange,
      ).toHaveBeenCalledTimes(1)
    })

    it('공개 시간과 DB 시간이 같으면 no-op으로 처리하고 질문지를 유지한다', async () => {
      const { service, transactionMeetingRepository, questionnaireService } =
        setupMeetingDetailsUpdate()

      await expect(
        service.updateMeetingDetails('meeting-1', 'host-token', {
          meetingTypeCode: MeetingTypeCode.Social,
          name: '기존 모임',
          date: '2026-08-23',
          time: '12:00',
        }),
      ).resolves.toMatchObject({ time: '12:00' })

      expect(transactionMeetingRepository.save).not.toHaveBeenCalled()
      expect(
        questionnaireService.restartAfterMeetingDetailsChange,
      ).not.toHaveBeenCalled()
    })

    it('빈 accessToken은 트랜잭션 전에 거부한다', () => {
      const { service, dataSource } = setupMeetingDetailsUpdate()

      expect(() =>
        service.updateMeetingDetails('meeting-1', '', { name: '저녁 모임' }),
      ).toThrow(
        expect.objectContaining({
          errorCode: CommonErrorCode.authenticationFailed,
        }),
      )
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('일반 참여자의 수정 요청을 거부한다', async () => {
      const { service, meetingAccessService } = setupMeetingDetailsUpdate()
      meetingAccessService.findParticipant.mockResolvedValue(
        Object.assign(new MeetingParticipant(), {
          role: ParticipantRole.Member,
        }),
      )

      await expect(
        service.updateMeetingDetails('meeting-1', 'member-token', {
          name: '저녁 모임',
        }),
      ).rejects.toMatchObject({ errorCode: MeetingErrorCode.hostOnly })
    })

    it('없는 모임의 수정 요청을 거부한다', async () => {
      const { service, meetingQueryBuilder } = setupMeetingDetailsUpdate()
      meetingQueryBuilder.getOne.mockResolvedValue(null)

      await expect(
        service.updateMeetingDetails('meeting-1', 'host-token', {
          name: '저녁 모임',
        }),
      ).rejects.toMatchObject({ errorCode: MeetingErrorCode.notFound })
    })

    it('없는 모임 유형으로 변경할 수 없다', async () => {
      const { service, meetingTypeRepository } = setupMeetingDetailsUpdate()
      meetingTypeRepository.findOne.mockResolvedValue(null)

      await expect(
        service.updateMeetingDetails('meeting-1', 'host-token', {
          meetingTypeCode: MeetingTypeCode.DatingHobby,
        }),
      ).rejects.toMatchObject({
        errorCode: MeetingErrorCode.meetingTypeNotFound,
      })
    })

    it.each(
      Object.values(MeetingStatus).filter(
        (status) => status !== MeetingStatus.RecommendationCollecting,
      ),
    )('%s 상태에서는 모임 기본 정보를 수정할 수 없다', async (status) => {
      const { service, meeting } = setupMeetingDetailsUpdate()
      meeting.status = status

      await expect(
        service.updateMeetingDetails('meeting-1', 'host-token', {
          name: '저녁 모임',
        }),
      ).rejects.toMatchObject({
        errorCode: MeetingErrorCode.meetingDetailsNotEditable,
      })
    })
  })

  it('초대 코드 미리보기는 참여자 토큰을 발급하지 않고 모임 요약을 반환한다', async () => {
    const { service, dataSource } = createMeetingService()
    const meeting = {
      id: 'meeting-1',
      accessToken: 'ABC234',
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      meetingLocation: {
        id: 'location-1',
        displayName: '서울특별시 강남구',
      },
    }
    const meetingRepository = {
      findOne: jest.fn().mockResolvedValue(meeting),
    }
    dataSource.getRepository.mockReturnValue(meetingRepository)

    await expect(
      service.previewInvitation({
        invitationCode: 'abc234',
      } satisfies InvitationPreviewRequest),
    ).resolves.toEqual({
      meetingId: 'meeting-1',
      invitationCode: 'ABC234',
      invitationUrl: 'https://momo.example/invite/ABC234',
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      locationName: '서울특별시 강남구',
    })
    expect(meetingRepository.findOne).toHaveBeenCalledWith({
      where: { accessToken: 'ABC234' },
      relations: { meetingLocation: true },
    })
  })

  it('게스트 참여는 동일 사용자 재시도를 중복 참여자로 만들지 않는다', async () => {
    const {
      service,
      dataSource,
      participantRepository,
      recommendationRepository,
      meetingAccessService,
    } = createMeetingService()
    const meetingType = {
      id: 'type-1',
      code: MeetingTypeCode.Social,
      name: '친목',
    }
    const location = {
      id: 'location-1',
      displayName: '강남역',
      address: '서울 강남구',
      latitude: 37.5,
      longitude: 127,
      externalAddressId: null,
      syncVersion: 1,
    }
    const meeting = Object.assign(new Meeting(), {
      id: 'meeting-1',
      accessToken: 'ABC234',
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      meetingType,
      meetingLocation: location,
      courseVersion: 1,
      courseImageKey: 'media/course.png',
      courseImageUploadedAt: new Date('2026-08-17T12:00:00.000Z'),
      status: MeetingStatus.RecommendationCollecting,
    })
    const hostUser = {
      id: 'user-host',
      userKey: 'device-host',
    }
    const guestUser = {
      id: 'user-guest',
      userKey: 'device-guest',
    }
    const host = {
      id: 'participant-host',
      meeting,
      user: hostUser,
      role: ParticipantRole.Host,
      nickname: '방장',
      accessToken: 'host-token',
      profileAvatarId: ProfileAvatarId.MomoBlue,
    }
    const guest = {
      id: 'participant-guest',
      meeting,
      user: guestUser,
      role: ParticipantRole.Member,
      nickname: '게스트',
      accessToken: 'guest-token',
      profileAvatarId: ProfileAvatarId.MomoYellow,
    }
    const managerRepositories = new Map<unknown, unknown>([
      [Meeting, { findOne: jest.fn().mockResolvedValue(meeting) }],
      [
        User,
        {
          findOne: jest.fn().mockResolvedValue(guestUser),
          create: jest.fn((value) => value),
          save: jest.fn().mockResolvedValue(guestUser),
        },
      ],
      [
        MeetingParticipant,
        {
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(guest),
          create: jest.fn((value) => value),
          save: jest.fn().mockResolvedValue(guest),
        },
      ],
    ])
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity: unknown) =>
        managerRepositories.get(entity),
      ),
    }
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    )

    participantRepository.findOne.mockResolvedValue(guest)
    participantRepository.find.mockResolvedValue([host, guest])
    meetingAccessService.findParticipant.mockResolvedValue(guest)
    recommendationRepository.find.mockResolvedValue([])
    const stepRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'step-1',
          order: 1,
          category: { id: 'category-1', slug: CategorySlug.Cafe, name: '카페' },
        },
      ]),
    }
    dataSource.getRepository.mockImplementation((entity) => {
      if (entity === Meeting) {
        return { findOne: jest.fn().mockResolvedValue(meeting) }
      }
      if (entity === CourseCategoryStep) return stepRepository
      return undefined
    })

    const joinRequest: JoinMeetingRequest = {
      invitationCode: 'ABC234',
      userKey: 'device-guest',
      nickname: '게스트',
      profileAvatarId: ProfileAvatarId.MomoYellow,
    }
    await expect(service.joinMeeting(joinRequest)).resolves.toMatchObject({
      participantAccessToken: 'guest-token',
      courseImageUrl: 'https://media.example/o/media/course.png',
      role: 'MEMBER',
      isHost: false,
      viewerParticipantId: 'participant-guest',
      participants: [
        { id: 'participant-host', role: 'HOST' },
        { id: 'participant-guest', role: 'MEMBER' },
      ],
      categorySteps: [{ id: 'category-1', slug: CategorySlug.Cafe, order: 1 }],
    })
  })

  it('코스 계획은 참여자만 조회하고 방장만 version을 증가시켜 수정한다', async () => {
    const { service, dataSource, meetingAccessService } = createMeetingService()
    const category = {
      id: 'category-1',
      slug: CategorySlug.Cafe,
      name: '카페',
    }
    const meeting = { id: 'meeting-1', courseVersion: 1 }
    const step = { id: 'step-1', meeting, category, order: 1 }
    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-1',
        role: ParticipantRole.Host,
        accessToken: 'host-token',
      }),
    )
    const meetingQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(meeting),
    }
    const deleteQueryBuilder = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    }
    const meetingRepository = {
      createQueryBuilder: jest.fn(() => meetingQueryBuilder),
      save: jest.fn().mockImplementation((value) => value),
      findOne: jest.fn(),
    }
    const stepRepository = {
      createQueryBuilder: jest.fn(() => deleteQueryBuilder),
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue([step]),
    }
    const managerRepositories = new Map<unknown, unknown>([
      [Category, { find: jest.fn().mockResolvedValue([category]) }],
      [Meeting, meetingRepository],
      [CourseCategoryStep, stepRepository],
    ])
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        managerRepositories.get(entity),
      ),
    }
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    )

    await expect(
      service.updateCoursePlan('meeting-1', 'host-token', {
        categorySlugs: [CategorySlug.Cafe],
        version: 1,
      } satisfies UpdateCoursePlanRequest),
    ).resolves.toMatchObject({
      meetingId: 'meeting-1',
      version: 2,
      categorySteps: [{ slug: CategorySlug.Cafe, order: 1 }],
    })
    expect(meetingAccessService.findParticipant).toHaveBeenCalledWith(
      'meeting-1',
      'host-token',
      manager,
    )
    expect(meetingQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    )
    expect(deleteQueryBuilder.execute).toHaveBeenCalled()

    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-2',
        role: ParticipantRole.Member,
      }),
    )
    await expect(
      service.updateCoursePlan('meeting-1', 'member-token', {
        categorySlugs: [CategorySlug.Cafe],
        version: 2,
      }),
    ).rejects.toMatchObject({ errorCode: MeetingErrorCode.hostOnly })
  })

  it('모임·기준 위치·코스·호스트 참여자를 하나의 transaction에서 만들고 수집 작업은 만들지 않는다', async () => {
    const { service, dataSource, placeSyncService } = createMeetingService()
    const meetingType = {
      id: 'type-1',
      code: MeetingTypeCode.Social,
      name: '친목',
    }
    const category = {
      id: 'category-1',
      slug: CategorySlug.Cafe,
      name: '카페',
    }
    const meeting = {
      id: 'meeting-1',
      meetingType,
      name: request.name,
      date: request.date,
      time: request.time,
      accessToken: 'ABC234',
    }
    const managerRepositories = new Map<unknown, Record<string, jest.Mock>>()
    const meetingTypeRepository = {
      findOne: jest.fn().mockResolvedValue(meetingType),
    }
    const categoryRepository = {
      find: jest.fn().mockResolvedValue([category]),
    }
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue({
        id: 'user-1',
      }),
    }
    const meetingRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(meeting),
    }
    const location = {
      id: 'location-1',
      meeting,
      displayName: request.firstMeetingLocation.displayName,
      address: request.firstMeetingLocation.address,
      latitude: request.firstMeetingLocation.latitude,
      longitude: request.firstMeetingLocation.longitude,
      externalAddressId: request.firstMeetingLocation.externalAddressId,
      syncVersion: 1,
    }
    const locationRepository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(location),
    }
    const step = { id: 'step-1', meeting, category, order: 1 }
    const stepRepository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue([step]),
    }
    const participant = {
      id: 'participant-1',
      meeting,
      accessToken: 'participant-token',
      nickname: request.host.nickname,
      profileAvatarId: request.host.profileAvatarId,
    }
    const participantRepository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(participant),
    }

    managerRepositories.set(MeetingType, meetingTypeRepository)
    managerRepositories.set(Category, categoryRepository)
    managerRepositories.set(User, userRepository)
    managerRepositories.set(Meeting, meetingRepository)
    managerRepositories.set(MeetingLocation, locationRepository)
    managerRepositories.set(CourseCategoryStep, stepRepository)
    managerRepositories.set(MeetingParticipant, participantRepository)

    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity: unknown) =>
        managerRepositories.get(entity),
      ),
    }
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    )

    await expect(service.createMeeting(request)).resolves.toMatchObject({
      meetingId: 'meeting-1',
      participantAccessToken: 'participant-token',
      firstLocation: {
        id: 'location-1',
        externalAddressId: 'kakao-address-1',
        syncVersion: 1,
      },
      categorySteps: [{ id: 'category-1', slug: CategorySlug.Cafe }],
    })
    expect(dataSource.transaction).toHaveBeenCalledTimes(1)
    expect(placeSyncService.createJobs).not.toHaveBeenCalled()
  })

  it('기준 위치 변경 시 이전 작업을 무효화하고 새 수집 작업은 등록하지 않는다', async () => {
    const { service, dataSource, placeSyncService, meetingAccessService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-1',
        role: ParticipantRole.Host,
      }),
    )
    const meeting = { id: 'meeting-1' }
    const location = {
      id: 'location-1',
      meeting,
      displayName: '이전 위치',
      address: '이전 주소',
      latitude: 37.5,
      longitude: 127,
      externalAddressId: null,
      syncVersion: 1,
      location: { type: 'Point', coordinates: [127, 37.5] },
    }
    const updatedLocation = { ...location, syncVersion: 2 }
    const locationRepository = {
      save: jest.fn().mockResolvedValue(updatedLocation),
      createQueryBuilder: jest.fn(),
    }
    const locationQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(location),
    }
    locationRepository.createQueryBuilder.mockImplementation(
      () => locationQueryBuilder,
    )
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    }
    const jobRepository = { createQueryBuilder: jest.fn(() => queryBuilder) }
    const category = { id: 'category-1', slug: CategorySlug.Cafe }
    const stepRepository = {
      find: jest.fn().mockResolvedValue([{ category }]),
    }
    const repositories = new Map<unknown, unknown>([
      [MeetingLocation, locationRepository],
      [PlaceSyncJob, jobRepository],
      [CourseCategoryStep, stepRepository],
    ])
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
    }
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    )

    await expect(
      service.updateLocation('meeting-1', 'participant-token', {
        displayName: '새 위치',
        address: '새 주소',
        latitude: 37.51,
        longitude: 127.01,
        externalAddressId: 'kakao-address-2',
      }),
    ).resolves.toMatchObject({
      id: 'location-1',
      displayName: '이전 위치',
      syncVersion: 2,
    })
    expect(queryBuilder.set).toHaveBeenCalled()
    expect(locationQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    )
    expect(placeSyncService.createJobs).not.toHaveBeenCalled()
  })

  it('선택한 코스의 반경 내 장소만 중복 없이 추천한다', async () => {
    const {
      service,
      dataSource,
      meetingAccessService,
      placeRepository,
      recommendationRepository,
      placePhotoService,
    } = createMeetingService()
    const participant = { id: 'participant-1' }
    const category = { id: 'category-1', slug: CategorySlug.Cafe }
    const place = {
      id: 'place-1',
      name: '카페',
      address: '주소',
      latitude: 37.5,
      longitude: 127,
      category,
    }
    const location = { latitude: 37.5, longitude: 127 }
    const previewPhoto = {
      id: 'google:place-1:1',
      url: 'https://places.googleapis.com/photo/place-1',
      width: 800,
      height: 600,
      source: 'GOOGLE',
      attributions: [],
      googleMapsUri: 'https://www.google.com/maps/place/photo-place-1',
      flagContentUri: null,
    }
    meetingAccessService.findParticipant.mockResolvedValue(participant)
    placeRepository.findOne.mockResolvedValue(place)
    recommendationRepository.findOne.mockResolvedValue(null)
    recommendationRepository.save.mockImplementation((value) =>
      Promise.resolve({ id: 'recommendation-1', ...value }),
    )
    placePhotoService.findPreviewPhotos.mockResolvedValue(
      new Map([['place-1', previewPhoto]]),
    )

    const locationRepository = {
      findOne: jest.fn().mockResolvedValue(location),
    }
    const stepRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'step-1' }),
    }
    dataSource.getRepository.mockImplementation((entity) =>
      entity === MeetingLocation ? locationRepository : stepRepository,
    )

    await expect(
      service.addRecommendation('meeting-1', 'participant-token', {
        placeId: 'place-1',
      }),
    ).resolves.toMatchObject({
      id: 'recommendation-1',
      place: { id: 'place-1' },
      previewPhoto,
    })
    expect(placePhotoService.findPreviewPhotos).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'place-1', name: '카페' }),
    ])

    recommendationRepository.findOne.mockResolvedValue({ id: 'existing' })
    await expect(
      service.addRecommendation('meeting-1', 'participant-token', {
        placeId: 'place-1',
      }),
    ).rejects.toMatchObject({
      errorCode: MeetingErrorCode.recommendationAlreadyExists,
    })
  })

  it('추천 목록의 대표 사진을 장소별 반복 호출 없이 한 번에 조회한다', async () => {
    const {
      service,
      dataSource,
      meetingAccessService,
      recommendationRepository,
      voteRepository,
      placePhotoService,
    } = createMeetingService()
    const category = { id: 'category-1', slug: CategorySlug.Cafe }
    const places = [
      {
        id: 'place-1',
        name: '첫 번째 카페',
        address: '첫 번째 주소',
        latitude: 37.5,
        longitude: 127,
        category,
      },
      {
        id: 'place-2',
        name: '두 번째 카페',
        address: '두 번째 주소',
        latitude: 37.5001,
        longitude: 127.0001,
        category,
      },
    ]
    const recommendations = places.map((place, index) => ({
      id: `recommendation-${index + 1}`,
      place,
      recommendedBy: { id: `participant-${index + 1}` },
    }))
    const previewPhoto = {
      id: 'google:place-1:1',
      url: 'https://places.googleapis.com/photo/place-1',
      width: 800,
      height: 600,
      source: 'GOOGLE',
      attributions: [],
      googleMapsUri: 'https://www.google.com/maps/place/photo-place-1',
      flagContentUri: null,
    }
    meetingAccessService.findParticipant.mockResolvedValue({
      id: 'participant-viewer',
    })
    recommendationRepository.find.mockResolvedValue(recommendations)
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        latitude: 37.5,
        longitude: 127,
      }),
    })
    voteRepository.getPreferenceSummaries.mockResolvedValue(
      new Map([
        [
          'recommendation-1',
          {
            likeCount: 2,
            dislikeCount: 0,
            myPreference: PreferenceType.Like,
          },
        ],
      ]),
    )
    placePhotoService.findPreviewPhotos.mockResolvedValue(
      new Map([['place-1', previewPhoto]]),
    )

    await expect(
      service.getRecommendations('meeting-1', 'participant-token'),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'recommendation-1',
        previewPhoto,
        likeCount: 2,
        dislikeCount: 0,
        viewerPreference: PreferenceType.Like,
      }),
      expect.objectContaining({
        id: 'recommendation-2',
        previewPhoto: null,
        likeCount: 0,
        dislikeCount: 0,
        viewerPreference: null,
      }),
    ])
    expect(placePhotoService.findPreviewPhotos).toHaveBeenCalledTimes(1)
    expect(placePhotoService.findPreviewPhotos).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'place-1', name: '첫 번째 카페' }),
      expect.objectContaining({ id: 'place-2', name: '두 번째 카페' }),
    ])
  })

  it('추천 장소 중 일부만 카카오 조회에 실패해도 나머지 추천만으로 목록을 반환한다', async () => {
    const {
      service,
      dataSource,
      meetingAccessService,
      recommendationRepository,
      placeLiveDataService,
    } = createMeetingService()
    const category = { id: 'category-1', slug: CategorySlug.Cafe }
    const places = [
      {
        id: 'place-1',
        name: '조회 성공 카페',
        address: '주소 1',
        latitude: 37.5,
        longitude: 127,
        category,
      },
      {
        id: 'place-2',
        name: '조회 실패 카페',
        address: '주소 2',
        latitude: 37.5001,
        longitude: 127.0001,
        category,
      },
    ]
    const recommendations = places.map((place, index) => ({
      id: `recommendation-${index + 1}`,
      place,
      recommendedBy: { id: `participant-${index + 1}` },
    }))
    meetingAccessService.findParticipant.mockResolvedValue({
      id: 'participant-viewer',
    })
    recommendationRepository.find.mockResolvedValue(recommendations)
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        latitude: 37.5,
        longitude: 127,
      }),
    })
    // place-2는 카카오 조회 실패를 흉내 내어 Map에서 아예 빠진 채로 반환됨
    placeLiveDataService.resolvePlaces.mockResolvedValueOnce(
      new Map([['place-1', places[0]]]),
    )

    const result = await service.getRecommendations(
      'meeting-1',
      'participant-token',
    )

    expect(result).toEqual([
      expect.objectContaining({ id: 'recommendation-1' }),
    ])
    expect(placeLiveDataService.resolvePlaces).toHaveBeenCalledWith(
      [places[0], places[1]],
      { latitude: 37.5, longitude: 127 },
      { allowPartial: true },
    )
  })

  it('손상된 모임의 방장 정보를 노출하지 않고 공통 내부 오류로 처리한다', async () => {
    const {
      service,
      dataSource,
      participantRepository,
      recommendationRepository,
    } = createMeetingService()
    const meeting = {
      id: 'meeting-1',
      accessToken: 'ABC234',
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      meetingType: { id: 'type-1', code: MeetingTypeCode.Social, name: '친목' },
      meetingLocation: {
        id: 'location-1',
        displayName: '강남역',
        address: '서울 강남구',
        latitude: 37.5,
        longitude: 127,
        externalAddressId: null,
        syncVersion: 1,
      },
    }

    participantRepository.findOne.mockResolvedValue({
      id: 'participant-viewer',
      accessToken: 'viewer-token',
      role: ParticipantRole.Member,
      user: { id: 'user-viewer' },
    })
    participantRepository.find.mockResolvedValue([])
    recommendationRepository.find.mockResolvedValue([])
    dataSource.getRepository.mockImplementation((entity) => {
      if (entity === Meeting) {
        return { findOne: jest.fn().mockResolvedValue(meeting) }
      }
      if (entity === CourseCategoryStep) {
        return { find: jest.fn().mockResolvedValue([]) }
      }
      return undefined
    })

    await expect(
      service.getMeetingDetail('meeting-1', 'viewer-token'),
    ).rejects.toMatchObject({
      errorCode: CommonErrorCode.internalServerError,
    })
  })

  it('코스가 확정된 모임은 상세 조회에 selectedCourse를 채운다', async () => {
    const {
      service,
      dataSource,
      participantRepository,
      recommendationRepository,
      meetingAccessService,
      courseCandidateRepository,
      courseCandidatePlaceRepository,
    } = createMeetingService()
    const meeting = Object.assign(new Meeting(), {
      id: 'meeting-1',
      accessToken: 'ABC234',
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      meetingType: { id: 'type-1', code: MeetingTypeCode.Social, name: '친목' },
      meetingLocation: {
        id: 'location-1',
        displayName: '강남역',
        address: '서울 강남구',
        latitude: 37.5,
        longitude: 127,
        externalAddressId: null,
        syncVersion: 1,
      },
      courseImageKey: null,
      status: MeetingStatus.CourseConfirmed,
    })
    const host = {
      id: 'participant-host',
      role: ParticipantRole.Host,
      nickname: '방장',
      accessToken: 'host-token',
      profileAvatarId: ProfileAvatarId.MomoBlue,
      user: { id: 'user-host', userKey: 'device-host' },
    }
    meetingAccessService.findParticipant.mockResolvedValue(host)
    participantRepository.find.mockResolvedValue([host])
    recommendationRepository.find.mockResolvedValue([])
    dataSource.getRepository.mockImplementation((entity) => {
      if (entity === Meeting) {
        return { findOne: jest.fn().mockResolvedValue(meeting) }
      }
      if (entity === CourseCategoryStep) {
        return { find: jest.fn().mockResolvedValue([]) }
      }
      return undefined
    })
    courseCandidateRepository.findOne.mockResolvedValue({ id: 'candidate-1' })
    courseCandidatePlaceRepository.find.mockResolvedValue([
      { order: 1, meetingPlaceRecommendation: { id: 'recommendation-1' } },
      { order: 2, meetingPlaceRecommendation: { id: 'recommendation-2' } },
    ])

    const result = await service.getMeetingDetail('meeting-1', 'host-token')

    expect(result.selectedCourse).toEqual({
      id: 'candidate-1',
      recommendationIds: ['recommendation-1', 'recommendation-2'],
    })
    expect(courseCandidateRepository.findOne).toHaveBeenCalledWith({
      where: { meeting: { id: 'meeting-1' }, isSelected: true },
    })
    expect(courseCandidatePlaceRepository.find).toHaveBeenCalledWith({
      where: { courseCandidate: { id: 'candidate-1' } },
      relations: { meetingPlaceRecommendation: true },
      order: { order: 'ASC' },
    })
  })

  it('코스가 확정되지 않은 모임은 상세 조회에서 selectedCourse가 null이고 후보를 조회하지 않는다', async () => {
    const {
      service,
      dataSource,
      participantRepository,
      recommendationRepository,
      meetingAccessService,
      courseCandidateRepository,
    } = createMeetingService()
    const meeting = Object.assign(new Meeting(), {
      id: 'meeting-1',
      accessToken: 'ABC234',
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      meetingType: { id: 'type-1', code: MeetingTypeCode.Social, name: '친목' },
      meetingLocation: {
        id: 'location-1',
        displayName: '강남역',
        address: '서울 강남구',
        latitude: 37.5,
        longitude: 127,
        externalAddressId: null,
        syncVersion: 1,
      },
      courseImageKey: null,
      status: MeetingStatus.CourseGenerated,
    })
    const host = {
      id: 'participant-host',
      role: ParticipantRole.Host,
      nickname: '방장',
      accessToken: 'host-token',
      profileAvatarId: ProfileAvatarId.MomoBlue,
      user: { id: 'user-host', userKey: 'device-host' },
    }
    meetingAccessService.findParticipant.mockResolvedValue(host)
    participantRepository.find.mockResolvedValue([host])
    recommendationRepository.find.mockResolvedValue([])
    dataSource.getRepository.mockImplementation((entity) => {
      if (entity === Meeting) {
        return { findOne: jest.fn().mockResolvedValue(meeting) }
      }
      if (entity === CourseCategoryStep) {
        return { find: jest.fn().mockResolvedValue([]) }
      }
      return undefined
    })

    const result = await service.getMeetingDetail('meeting-1', 'host-token')

    expect(result.selectedCourse).toBeNull()
    expect(courseCandidateRepository.findOne).not.toHaveBeenCalled()
  })

  it('사용자 upsert 뒤 조회가 실패하면 공통 내부 오류로 처리한다', async () => {
    const { service } = createMeetingService()
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      }),
    }

    await expect(
      (
        service as unknown as {
          findOrCreateUser: (manager: unknown, userKey: string) => Promise<User>
        }
      ).findOrCreateUser(manager, 'device-1'),
    ).rejects.toBeInstanceOf(CommonException)
    await expect(
      (
        service as unknown as {
          findOrCreateUser: (manager: unknown, userKey: string) => Promise<User>
        }
      ).findOrCreateUser(manager, 'device-1'),
    ).rejects.toMatchObject({
      errorCode: CommonErrorCode.internalServerError,
    })
  })

  describe('getMeetingStatus', () => {
    it('참여자 검증에 실패하면 그대로 전파한다', async () => {
      const { service, meetingAccessService } = createMeetingService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new CommonException(CommonErrorCode.authenticationFailed),
      )

      const promise = service.getMeetingStatus('1', 'bad-token')

      await expect(promise).rejects.toBeInstanceOf(CommonException)
      expect(meetingAccessService.findParticipant).toHaveBeenCalledWith(
        '1',
        'bad-token',
      )
    })

    it('확정 상태가 아니면 코스 후보를 조회하지 않고 null을 반환한다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerating),
      })

      await expect(service.getMeetingStatus('1', 'token')).resolves.toEqual({
        status: MeetingStatus.CourseGenerating,
        confirmedCourseCandidateId: null,
      })
      expect(courseCandidateRepository.findOne).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerated,
      MeetingStatus.CourseGenerationFailed,
    ])('%s 상태에서도 코스 후보를 조회하지 않는다', async (status) => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(status),
      })

      await expect(
        service.getMeetingStatus('1', 'token'),
      ).resolves.toMatchObject({ confirmedCourseCandidateId: null })
      expect(courseCandidateRepository.findOne).not.toHaveBeenCalled()
    })

    it('확정 상태면 isSelected 코스 후보 ID를 함께 반환한다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(MeetingStatus.CourseConfirmed),
      })
      courseCandidateRepository.findOne.mockResolvedValue({ id: '5' })

      await expect(service.getMeetingStatus('1', 'token')).resolves.toEqual({
        status: MeetingStatus.CourseConfirmed,
        confirmedCourseCandidateId: '5',
      })
      expect(courseCandidateRepository.findOne).toHaveBeenCalledWith({
        where: { meeting: { id: '1' }, isSelected: true },
      })
    })

    it('확정 상태인데 선택된 코스 후보가 없으면 데이터 정합성 오류로 500을 던진다', async () => {
      const { service, meetingAccessService, courseCandidateRepository } =
        createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(MeetingStatus.CourseConfirmed),
      })
      courseCandidateRepository.findOne.mockResolvedValue(null)

      const promise = service.getMeetingStatus('1', 'token')

      await expect(promise).rejects.toBeInstanceOf(MeetingException)
      await expect(promise).rejects.toThrow(
        '확정된 모임인데 선택된 코스 후보를 찾을 수 없습니다.',
      )
    })
  })

  describe('getMapPins', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const {
        service,
        meetingAccessService,
        meetingRepository,
        recommendationRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new CommonException(CommonErrorCode.authenticationFailed),
      )

      const promise = service.getMapPins('1', '')

      await expect(promise).rejects.toBeInstanceOf(CommonException)
      expect(meetingRepository.findOne).not.toHaveBeenCalled()
      expect(recommendationRepository.find).not.toHaveBeenCalled()
    })

    it.each([
      MeetingStatus.RecommendationCollecting,
      MeetingStatus.CourseGenerating,
      MeetingStatus.CourseGenerationFailed,
    ])('%s 상태에서는 시작지와 공유 장소를 함께 반환한다', async (status) => {
      const {
        service,
        meetingAccessService,
        meetingRepository,
        recommendationRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(status),
      })
      const meetingWithLocation = new Meeting()
      meetingWithLocation.meetingLocation = {
        displayName: '강남역',
        longitude: 127.0276,
        latitude: 37.4979,
      } as MeetingLocation
      meetingRepository.findOne.mockResolvedValue(meetingWithLocation)
      recommendationRepository.find.mockResolvedValue([
        {
          place: {
            id: 'place-1',
            name: '성수 카페 모모',
            longitude: 127.0557,
            latitude: 37.5446,
            category: { name: '카페', slug: CategorySlug.Cafe },
          },
        },
      ])

      await expect(service.getMapPins('1', 'token')).resolves.toEqual({
        startPlace: {
          name: '강남역',
          longitude: 127.0276,
          latitude: 37.4979,
        },
        sharedPlaces: [
          {
            placeId: 'place-1',
            name: '성수 카페 모모',
            category: '카페',
            categorySlug: CategorySlug.Cafe,
            longitude: 127.0557,
            latitude: 37.5446,
          },
        ],
      })
      expect(meetingRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: { meetingLocation: true },
      })
      expect(recommendationRepository.find).toHaveBeenCalledWith({
        where: { meeting: { id: '1' } },
        relations: { place: { category: true } },
        order: { createdAt: 'ASC' },
      })
    })

    it.each([MeetingStatus.CourseGenerated, MeetingStatus.CourseConfirmed])(
      '%s 상태에서는 DB 조회 없이 409를 던진다',
      async (status) => {
        const {
          service,
          meetingAccessService,
          meetingRepository,
          recommendationRepository,
        } = createMeetingService()
        meetingAccessService.findParticipant.mockResolvedValue({
          meeting: createMeetingWithStatus(status),
        })

        const promise = service.getMapPins('1', 'token')

        await expect(promise).rejects.toBeInstanceOf(MeetingException)
        expect(meetingRepository.findOne).not.toHaveBeenCalled()
        expect(recommendationRepository.find).not.toHaveBeenCalled()
      },
    )

    it('모임 레코드 자체를 찾지 못하면 404를 던진다', async () => {
      const { service, meetingAccessService, meetingRepository } =
        createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      meetingRepository.findOne.mockResolvedValue(null)

      const promise = service.getMapPins('1', 'token')

      await expect(promise).rejects.toBeInstanceOf(MeetingException)
      await expect(promise).rejects.toThrow('해당 모임을 찾을 수 없습니다.')
    })

    it('모임은 있지만 시작지 정보가 없으면 데이터 정합성 오류로 500을 던진다', async () => {
      const { service, meetingAccessService, meetingRepository } =
        createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      const meetingWithoutLocation = new Meeting()
      meetingWithoutLocation.id = '1'
      meetingRepository.findOne.mockResolvedValue(meetingWithoutLocation)

      const promise = service.getMapPins('1', 'token')

      await expect(promise).rejects.toBeInstanceOf(MeetingException)
      await expect(promise).rejects.toThrow(
        '모임은 존재하지만 시작지 정보를 찾을 수 없는 데이터 정합성 오류입니다.',
      )
    })
  })

  describe('updatePlacePreference', () => {
    it('참여자 검증에 실패하면 DB 조회 없이 그대로 전파한다', async () => {
      const {
        service,
        meetingAccessService,
        recommendationRepository,
        voteRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new CommonException(CommonErrorCode.authenticationFailed),
      )

      const promise = service.updatePlacePreference(
        '1',
        '2',
        '',
        PreferenceType.Like,
      )

      await expect(promise).rejects.toBeInstanceOf(CommonException)
      expect(recommendationRepository.exists).not.toHaveBeenCalled()
      expect(voteRepository.applyPreference).not.toHaveBeenCalled()
    })

    it.each([MeetingStatus.CourseGenerating, MeetingStatus.CourseConfirmed])(
      '%s 상태에서는 DB 조회 없이 409를 던진다',
      async (status) => {
        const {
          service,
          meetingAccessService,
          recommendationRepository,
          voteRepository,
        } = createMeetingService()
        meetingAccessService.findParticipant.mockResolvedValue({
          id: 'participant-1',
          meeting: createMeetingWithStatus(status),
        })

        const promise = service.updatePlacePreference(
          '1',
          '2',
          'token',
          PreferenceType.Like,
        )

        await expect(promise).rejects.toBeInstanceOf(MeetingException)
        expect(recommendationRepository.exists).not.toHaveBeenCalled()
        expect(voteRepository.applyPreference).not.toHaveBeenCalled()
      },
    )

    it('추천 장소가 해당 모임 소속이 아니면 404를 던진다', async () => {
      const {
        service,
        meetingAccessService,
        recommendationRepository,
        voteRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'participant-1',
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      recommendationRepository.exists.mockResolvedValue(false)

      const promise = service.updatePlacePreference(
        '1',
        '2',
        'token',
        PreferenceType.Like,
      )

      await expect(promise).rejects.toBeInstanceOf(MeetingException)
      expect(recommendationRepository.exists).toHaveBeenCalledWith({
        where: { id: '2', meeting: { id: '1' } },
      })
      expect(voteRepository.applyPreference).not.toHaveBeenCalled()
    })

    it('검증을 통과하면 voteRepository에 위임하고 결과를 응답 형태로 반환한다', async () => {
      const {
        service,
        meetingAccessService,
        recommendationRepository,
        voteRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'participant-1',
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      recommendationRepository.exists.mockResolvedValue(true)
      voteRepository.applyPreference.mockResolvedValue({
        likeCount: 3,
        dislikeCount: 1,
      })

      const result = await service.updatePlacePreference(
        '1',
        '2',
        'token',
        PreferenceType.Like,
      )

      expect(voteRepository.applyPreference).toHaveBeenCalledWith(
        '2',
        'participant-1',
        PreferenceType.Like,
      )
      expect(result).toEqual({
        likeCount: 3,
        dislikeCount: 1,
        myPreference: PreferenceType.Like,
      })
    })

    it('preference가 null이어도 그대로 voteRepository에 위임한다', async () => {
      const {
        service,
        meetingAccessService,
        recommendationRepository,
        voteRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        id: 'participant-1',
        meeting: createMeetingWithStatus(MeetingStatus.CourseGenerated),
      })
      recommendationRepository.exists.mockResolvedValue(true)
      voteRepository.applyPreference.mockResolvedValue({
        likeCount: 0,
        dislikeCount: 0,
      })

      const result = await service.updatePlacePreference(
        '1',
        '2',
        'token',
        null,
      )

      expect(voteRepository.applyPreference).toHaveBeenCalledWith(
        '2',
        'participant-1',
        null,
      )
      expect(result).toEqual({
        likeCount: 0,
        dislikeCount: 0,
        myPreference: null,
      })
    })
  })

  describe('getSimilarPlaces', () => {
    it('참여자 검증에 실패하면 그대로 전파한다', async () => {
      const { service, meetingAccessService } = createMeetingService()
      meetingAccessService.findParticipant.mockRejectedValue(
        new CommonException(CommonErrorCode.authenticationFailed),
      )

      const promise = service.getSimilarPlaces(
        '1',
        '2',
        'bad-token',
        undefined,
        5,
      )

      await expect(promise).rejects.toBeInstanceOf(CommonException)
    })

    it('허용되지 않은 상태면 409를 던지고 장소를 조회하지 않는다', async () => {
      const { service, meetingAccessService, placeRepository } =
        createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(MeetingStatus.CourseConfirmed),
      })

      const promise = service.getSimilarPlaces('1', '2', 'token', undefined, 5)

      await expect(promise).rejects.toBeInstanceOf(MeetingException)
      expect(placeRepository.findOne).not.toHaveBeenCalled()
    })

    it('기준 장소를 찾지 못하면 404를 던진다', async () => {
      const { service, meetingAccessService, placeRepository } =
        createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      placeRepository.findOne.mockResolvedValue(null)

      const promise = service.getSimilarPlaces('1', '2', 'token', undefined, 5)

      await expect(promise).rejects.toBeInstanceOf(MeetingException)
      await expect(promise).rejects.toThrow('장소를 찾을 수 없습니다.')
    })

    it('선택한 장소의 카테고리·위치 기준으로 무작위 장소를 조회하고 응답으로 변환한다', async () => {
      const {
        service,
        meetingAccessService,
        placeRepository,
        placeSearchRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      placeRepository.findOne.mockResolvedValue({
        id: '2',
        category: { id: '1' },
        latitude: 37.544,
        longitude: 127.055,
      })
      placeSearchRepository.findSimilar.mockResolvedValue([
        {
          id: '11',
          name: '성수 카페 2',
          address: '서울 성동구 성수이로 2',
          latitude: 37.5447,
          longitude: 127.0558,
          previewUrl: null,
          source: PlaceSource.Google,
          providerPlaceId: 'google-11',
          roadAddress: '서울 성동구 성수이로 2',
          phone: null,
          placeUrl: null,
        },
      ])

      await expect(
        service.getSimilarPlaces('1', '2', 'token', ['3', '4'], 5),
      ).resolves.toEqual([
        {
          id: '11',
          categoryId: '1',
          name: '성수 카페 2',
          address: '서울 성동구 성수이로 2',
          latitude: 37.5447,
          longitude: 127.0558,
          primaryImageUrl: null,
          previewUrl: null,
          previewPhoto: null,
          placeUrl: null,
        },
      ])
      expect(placeRepository.findOne).toHaveBeenCalledWith({
        where: { id: '2' },
        relations: { category: true },
      })
      expect(placeSearchRepository.findSimilar).toHaveBeenCalledWith(
        '1',
        ['2', '3', '4'],
        37.544,
        127.055,
        2000,
        5,
      )
    })

    it('이미 모임에 추천된 장소는 후보에서 제외한다', async () => {
      const {
        service,
        meetingAccessService,
        placeRepository,
        recommendationRepository,
        placeSearchRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      placeRepository.findOne.mockResolvedValue({
        id: '2',
        category: { id: '1' },
        latitude: 37.544,
        longitude: 127.055,
      })
      recommendationRepository.find.mockResolvedValue([
        { place: { id: '20' } },
        { place: { id: '21' } },
      ])
      placeSearchRepository.findSimilar.mockResolvedValue([])

      await service.getSimilarPlaces('1', '2', 'token', ['3', '4'], 5)

      expect(recommendationRepository.find).toHaveBeenCalledWith({
        where: { meeting: { id: '1' } },
        relations: { place: true },
        select: { place: { id: true } },
      })
      expect(placeSearchRepository.findSimilar).toHaveBeenCalledWith(
        '1',
        ['2', '3', '4', '20', '21'],
        37.544,
        127.055,
        2000,
        5,
      )
    })

    it('요청 개수가 100을 초과하면 100으로 제한한다', async () => {
      const {
        service,
        meetingAccessService,
        placeRepository,
        placeSearchRepository,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      placeRepository.findOne.mockResolvedValue({
        id: '2',
        category: { id: '1' },
        latitude: 37.544,
        longitude: 127.055,
      })
      placeSearchRepository.findSimilar.mockResolvedValue([])

      await service.getSimilarPlaces('1', '2', 'token', undefined, 500)

      expect(placeSearchRepository.findSimilar).toHaveBeenCalledWith(
        '1',
        ['2'],
        37.544,
        127.055,
        2000,
        100,
      )
    })

    it('무작위 추천이 부족하면 화면에 노출 중이던 장소와 검증된 사진으로 채운다', async () => {
      const {
        service,
        meetingAccessService,
        placeRepository,
        placeSearchRepository,
        placePhotoService,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      placeRepository.findOne.mockResolvedValue({
        id: '2',
        category: { id: '1' },
        latitude: 37.544,
        longitude: 127.055,
      })
      placeSearchRepository.findSimilar.mockResolvedValue([])
      placeRepository.find.mockResolvedValue([
        {
          id: '3',
          name: '노출 중이던 장소',
          address: '서울 성동구 성수이로 3',
          latitude: 37.5448,
          longitude: 127.0559,
          source: PlaceSource.Google,
          providerPlaceId: 'google-3',
          roadAddress: '서울 성동구 성수이로 3',
          phone: null,
          placeUrl: 'https://maps.google.com/place/3',
        },
      ])
      const previewPhoto = {
        id: 'google:3:1',
        url: 'https://places.googleapis.com/photo/3',
        width: 800,
        height: 600,
        source: 'GOOGLE',
        attributions: [],
        googleMapsUri: 'https://www.google.com/maps/place/photo-3',
        flagContentUri: null,
      }
      placePhotoService.findPreviewPhotos.mockResolvedValue(
        new Map([['3', previewPhoto]]),
      )

      await expect(
        service.getSimilarPlaces('1', '2', 'token', ['3', '4'], 2),
      ).resolves.toEqual([
        {
          id: '3',
          categoryId: '1',
          name: '노출 중이던 장소',
          address: '서울 성동구 성수이로 3',
          latitude: 37.5448,
          longitude: 127.0559,
          primaryImageUrl: previewPhoto.url,
          previewUrl: previewPhoto.url,
          previewPhoto,
          placeUrl: 'https://maps.google.com/place/3',
        },
      ])
      expect(placeRepository.find).toHaveBeenCalledWith({
        where: { id: In(['3', '4']) },
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
          source: true,
          providerPlaceId: true,
          roadAddress: true,
          phone: true,
          placeUrl: true,
        },
      })
    })

    it('카카오 기준 장소는 실시간 검색 후보를 shuffle하여 추천한다', async () => {
      const {
        service,
        meetingAccessService,
        placeRepository,
        dataSource,
        placeLiveDataService,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      placeRepository.findOne.mockResolvedValue({
        id: '2',
        source: PlaceSource.Kakao,
        category: { id: '1' },
        latitude: 37.544,
        longitude: 127.055,
      })
      dataSource.getRepository.mockReturnValue({
        findOne: jest
          .fn()
          .mockResolvedValue({ latitude: 37.544, longitude: 127.055 }),
      })
      placeLiveDataService.searchKakao.mockResolvedValue({
        places: [
          {
            id: '11',
            category: { id: '1' },
            name: '성수 카페 A',
            address: '서울 성동구 성수이로 11',
            latitude: 37.5447,
            longitude: 127.0558,
            placeUrl: null,
          },
          {
            id: '12',
            category: { id: '1' },
            name: '성수 카페 B',
            address: '서울 성동구 성수이로 12',
            latitude: 37.5448,
            longitude: 127.0559,
            placeUrl: null,
          },
        ],
        isComplete: true,
        unsupportedCategorySlugs: [],
      })
      const shuffleSpy = jest.spyOn(placeRepositoryModule, 'shuffle')

      await service.getSimilarPlaces('1', '2', 'token', undefined, 5)

      expect(shuffleSpy).toHaveBeenCalledWith([
        expect.objectContaining({ id: '11' }),
        expect.objectContaining({ id: '12' }),
      ])
      expect(placeLiveDataService.searchKakao).toHaveBeenCalledWith(
        { latitude: 37.544, longitude: 127.055 },
        [{ id: '1' }],
        undefined,
        { targetTotal: 250 },
      )

      shuffleSpy.mockRestore()
    })

    it('Kakao 유사 장소도 업체가 검증된 사진만 응답한다', async () => {
      const {
        service,
        meetingAccessService,
        placeRepository,
        dataSource,
        placeLiveDataService,
        placePhotoService,
      } = createMeetingService()
      meetingAccessService.findParticipant.mockResolvedValue({
        meeting: createMeetingWithStatus(
          MeetingStatus.RecommendationCollecting,
        ),
      })
      placeRepository.findOne.mockResolvedValue({
        id: '2',
        source: PlaceSource.Kakao,
        category: { id: '1', name: '카페', slug: 'cafe' },
      })
      dataSource.getRepository.mockReturnValue({
        findOne: jest
          .fn()
          .mockResolvedValue({ latitude: 37.5, longitude: 127 }),
      })
      const candidate = {
        id: '11',
        source: PlaceSource.Kakao,
        providerPlaceId: 'kakao-11',
        category: { id: '1', name: '카페', slug: 'cafe' },
        name: '성수 카페 2',
        address: '서울 성동구 성수동 2',
        roadAddress: '서울 성동구 성수이로 2',
        latitude: 37.5447,
        longitude: 127.0558,
        phone: null,
        placeUrl: 'https://place.map.kakao.com/kakao-11',
        previewUrl: null,
        distanceMeters: 10,
      }
      placeLiveDataService.searchKakao.mockResolvedValue({
        places: [candidate],
        isComplete: true,
        unsupportedCategorySlugs: [],
      })
      const previewPhoto = {
        id: 'google:11:1',
        url: 'https://places.googleapis.com/photo/11',
        width: 800,
        height: 600,
        source: 'GOOGLE',
        attributions: [],
        googleMapsUri: 'https://www.google.com/maps/place/photo-11',
        flagContentUri: null,
      }
      placePhotoService.findPreviewPhotos.mockResolvedValue(
        new Map([['11', previewPhoto]]),
      )

      await expect(
        service.getSimilarPlaces('1', '2', 'token', undefined, 5),
      ).resolves.toEqual([
        {
          id: '11',
          categoryId: '1',
          name: '성수 카페 2',
          address: '서울 성동구 성수동 2',
          latitude: 37.5447,
          longitude: 127.0558,
          primaryImageUrl: previewPhoto.url,
          previewUrl: previewPhoto.url,
          previewPhoto,
          placeUrl: 'https://place.map.kakao.com/kakao-11',
        },
      ])
      expect(placePhotoService.findPreviewPhotos).toHaveBeenCalledWith([
        candidate,
      ])
    })
  })

  it('코스 확정 후 방장의 이미지를 원자적으로 등록한다', async () => {
    const { service, dataSource, meetingAccessService, mediaService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-host',
        role: ParticipantRole.Host,
      }),
    )
    const meeting = Object.assign(new Meeting(), {
      id: 'meeting-1',
      status: MeetingStatus.CourseConfirmed,
      courseImageKey: null,
      courseImageUploadedAt: null,
    })
    const execute = jest.fn().mockResolvedValue({ affected: 1 })
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    }
    const meetingRepository = {
      findOne: jest.fn().mockResolvedValue(meeting),
      createQueryBuilder: jest.fn(() => queryBuilder),
    }
    dataSource.getRepository.mockReturnValue(meetingRepository)
    const asset = { objectKey: 'media/2026/08/new.png' }
    mediaService.storePublicImage.mockResolvedValue({
      asset,
      publicUrl: 'https://media.example/o/media/2026/08/new.png',
    })

    await expect(
      service.storeCourseImage('meeting-1', 'host-token', {
        buffer: Buffer.from('png'),
        mimetype: 'image/png',
      }),
    ).resolves.toMatchObject({
      imageUrl: 'https://media.example/o/media/2026/08/new.png',
      uploadedAt: expect.any(Date),
    })
    expect(queryBuilder.set).toHaveBeenCalledWith({
      courseImageKey: asset.objectKey,
      courseImageUploadedAt: expect.any(Date),
    })
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'course_image_key IS NULL',
    )
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('status = :status', {
      status: MeetingStatus.CourseConfirmed,
    })
    expect(mediaService.discardStoredImage).not.toHaveBeenCalled()
  })

  it('일반 모임원의 코스 이미지 등록을 거절한다', async () => {
    const { service, dataSource, meetingAccessService, mediaService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-member',
        role: ParticipantRole.Member,
      }),
    )

    await expect(
      service.storeCourseImage('meeting-1', 'member-token', {
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
      }),
    ).rejects.toMatchObject({ errorCode: MeetingErrorCode.hostOnly })
    expect(dataSource.getRepository).not.toHaveBeenCalled()
    expect(mediaService.storePublicImage).not.toHaveBeenCalled()
  })

  it('모임원이 아니면 코스 이미지를 저장하지 않는다', async () => {
    const { service, dataSource, meetingAccessService, mediaService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockRejectedValue(
      new CommonException(CommonErrorCode.authenticationFailed),
    )

    await expect(
      service.storeCourseImage('meeting-1', 'invalid-token', {
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
      }),
    ).rejects.toMatchObject({
      errorCode: CommonErrorCode.authenticationFailed,
    })
    expect(dataSource.getRepository).not.toHaveBeenCalled()
    expect(mediaService.storePublicImage).not.toHaveBeenCalled()
  })

  it('이미 등록된 코스 이미지는 새 파일로 덮어쓰지 않는다', async () => {
    const { service, dataSource, meetingAccessService, mediaService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-host',
        role: ParticipantRole.Host,
      }),
    )
    const uploadedAt = new Date('2026-08-17T12:00:00.000Z')
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(
        Object.assign(new Meeting(), {
          id: 'meeting-1',
          status: MeetingStatus.CourseConfirmed,
          courseImageKey: 'media/winner.png',
          courseImageUploadedAt: uploadedAt,
        }),
      ),
    })

    await expect(
      service.storeCourseImage('meeting-1', 'host-token', {
        buffer: Buffer.from('another'),
        mimetype: 'image/png',
      }),
    ).resolves.toEqual({
      imageUrl: 'https://media.example/o/media/winner.png',
      uploadedAt,
    })
    expect(mediaService.storePublicImage).not.toHaveBeenCalled()
  })

  it('코스 확정 전에는 코스 이미지를 저장하지 않는다', async () => {
    const { service, dataSource, meetingAccessService, mediaService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-host',
        role: ParticipantRole.Host,
      }),
    )
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(
        Object.assign(new Meeting(), {
          id: 'meeting-1',
          status: MeetingStatus.CourseGenerated,
          courseImageKey: null,
        }),
      ),
    })

    await expect(
      service.storeCourseImage('meeting-1', 'host-token', {
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
      }),
    ).rejects.toMatchObject({
      errorCode: MeetingErrorCode.courseImageStateInvalid,
    })
    expect(mediaService.storePublicImage).not.toHaveBeenCalled()
  })

  it('동시 업로드 경쟁에서 지면 자산을 폐기하고 승자를 반환한다', async () => {
    const { service, dataSource, meetingAccessService, mediaService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-host',
        role: ParticipantRole.Host,
      }),
    )
    const uploadedAt = new Date('2026-08-17T12:00:00.000Z')
    const initial = Object.assign(new Meeting(), {
      id: 'meeting-1',
      status: MeetingStatus.CourseConfirmed,
      courseImageKey: null,
      courseImageUploadedAt: null,
    })
    const winner = Object.assign(new Meeting(), {
      ...initial,
      courseImageKey: 'media/winner.png',
      courseImageUploadedAt: uploadedAt,
    })
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    }
    dataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValueOnce(initial)
        .mockResolvedValueOnce(winner),
      createQueryBuilder: jest.fn(() => queryBuilder),
    })
    const losingAsset = { objectKey: 'media/loser.png' }
    mediaService.storePublicImage.mockResolvedValue({
      asset: losingAsset,
      publicUrl: 'https://media.example/o/media/loser.png',
    })

    await expect(
      service.storeCourseImage('meeting-1', 'host-token', {
        buffer: Buffer.from('loser'),
        mimetype: 'image/png',
      }),
    ).resolves.toEqual({
      imageUrl: 'https://media.example/o/media/winner.png',
      uploadedAt,
    })
    expect(mediaService.discardStoredImage).toHaveBeenCalledWith(losingAsset)
  })

  it('이미지 저장 후 모임 DB 갱신이 실패하면 자산을 보상 삭제한다', async () => {
    const { service, dataSource, meetingAccessService, mediaService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockResolvedValue(
      Object.assign(new MeetingParticipant(), {
        id: 'participant-host',
        role: ParticipantRole.Host,
      }),
    )
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockRejectedValue(new Error('db unavailable')),
    }
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(
        Object.assign(new Meeting(), {
          id: 'meeting-1',
          status: MeetingStatus.CourseConfirmed,
          courseImageKey: null,
        }),
      ),
      createQueryBuilder: jest.fn(() => queryBuilder),
    })
    const asset = { objectKey: 'media/orphan.png' }
    mediaService.storePublicImage.mockResolvedValue({
      asset,
      publicUrl: 'https://media.example/o/media/orphan.png',
    })

    await expect(
      service.storeCourseImage('meeting-1', 'host-token', {
        buffer: Buffer.from('orphan'),
        mimetype: 'image/png',
      }),
    ).rejects.toThrow('db unavailable')
    expect(mediaService.discardStoredImage).toHaveBeenCalledWith(asset)
  })

  it('모임원에게만 등록된 코스 이미지 다운로드를 제공한다', async () => {
    const { service, dataSource, meetingAccessService, mediaService } =
      createMeetingService()
    meetingAccessService.findParticipant.mockResolvedValue({
      id: 'participant-1',
    })
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        id: 'meeting-1',
        courseImageKey: 'media/course.webp',
      }),
    })
    const download = { body: {}, mimeType: 'image/webp' }
    mediaService.downloadPublicImage.mockResolvedValue(download)

    await expect(
      service.downloadCourseImage('meeting-1', 'member-token'),
    ).resolves.toBe(download)
    expect(mediaService.downloadPublicImage).toHaveBeenCalledWith(
      'media/course.webp',
    )
  })

  it('등록된 코스 이미지가 없으면 다운로드를 404로 거절한다', async () => {
    const { service, dataSource, participantRepository, mediaService } =
      createMeetingService()
    participantRepository.findOne.mockResolvedValue({
      id: 'participant-1',
    })
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        id: 'meeting-1',
        courseImageKey: null,
      }),
    })

    await expect(
      service.downloadCourseImage('meeting-1', 'member-token'),
    ).rejects.toMatchObject({
      errorCode: MeetingErrorCode.courseImageNotFound,
    })
    expect(mediaService.downloadPublicImage).not.toHaveBeenCalled()
  })
})
