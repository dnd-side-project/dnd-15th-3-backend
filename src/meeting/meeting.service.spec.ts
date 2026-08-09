import { ConflictException, ForbiddenException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { Category } from 'src/category/entities/category.entity'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { Env } from 'src/config/env'
import { CourseCategoryStep } from 'src/course/entities/course-category-step.entity'
import { PlaceSyncJob } from 'src/place/entities/place-sync-job.entity'
import type { PlaceSyncService } from 'src/place/sync/place-sync.service'
import { User } from 'src/user/entities/user.entity'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { Meeting } from './entities/meeting.entity'
import { MeetingLocation } from './entities/meeting-location.entity'
import { MeetingParticipant } from './entities/meeting-participant.entity'
import { MeetingType } from './entities/meeting-type.entity'
import { MeetingTypeCode } from './enums/meeting-type-code.enum'
import { ParticipantRole } from './enums/participant-role.enum'
import { MeetingService } from './meeting.service'
import type {
  CreateMeetingRequest,
  InvitationPreviewRequest,
  JoinMeetingRequest,
  UpdateCoursePlanRequest,
} from './schema/meeting-request.schema'

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
  const participantRepository = { findOne: jest.fn(), find: jest.fn() }
  const placeRepository = { findOne: jest.fn() }
  const recommendationRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  }
  const dataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  }

  const service = new MeetingService(
    config as unknown as ConfigService<Env, true>,
    dataSource as never,
    placeSyncService as unknown as PlaceSyncService,
    participantRepository as never,
    placeRepository as never,
    recommendationRepository as never,
  )

  return {
    service,
    config,
    placeSyncService,
    participantRepository,
    placeRepository,
    recommendationRepository,
    dataSource,
  }
}

describe('MeetingService', () => {
  it('초대 코드 미리보기는 참여자 토큰을 발급하지 않고 모임 요약을 반환한다', async () => {
    const { service, dataSource } = createMeetingService()
    const meeting = {
      id: 'meeting-1',
      accessToken: 'ABC234',
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      meetingLocation: { id: 'location-1' },
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
      locationId: 'location-1',
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
    const meeting = {
      id: 'meeting-1',
      accessToken: 'ABC234',
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      meetingType,
      meetingLocation: location,
      courseVersion: 1,
    }
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
          findOne: jest.fn().mockResolvedValue(null),
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
            .mockResolvedValueOnce(null),
          create: jest.fn((value) => value),
          save: jest.fn().mockResolvedValue(guest),
        },
      ],
    ])
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        managerRepositories.get(entity),
      ),
    }
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    )

    participantRepository.findOne.mockResolvedValue(guest)
    participantRepository.find.mockResolvedValue([host, guest])
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
      role: 'MEMBER',
      isHost: false,
      viewerParticipantId: 'participant-guest',
      participants: [
        { id: 'participant-host', role: 'HOST' },
        { id: 'participant-guest', role: 'MEMBER' },
      ],
    })
  })

  it('코스 계획은 참여자만 조회하고 방장만 version을 증가시켜 수정한다', async () => {
    const { service, dataSource, participantRepository } =
      createMeetingService()
    const category = {
      id: 'category-1',
      slug: CategorySlug.Cafe,
      name: '카페',
    }
    const meeting = { id: 'meeting-1', courseVersion: 1 }
    const step = { id: 'step-1', meeting, category, order: 1 }
    participantRepository.findOne.mockResolvedValue({
      id: 'participant-1',
      role: ParticipantRole.Host,
      accessToken: 'host-token',
    })
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
      [
        MeetingParticipant,
        {
          findOne: jest.fn().mockResolvedValue({
            id: 'participant-1',
            role: ParticipantRole.Host,
          }),
        },
      ],
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
    expect(meetingQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    )
    expect(deleteQueryBuilder.execute).toHaveBeenCalled()

    managerRepositories.set(MeetingParticipant, {
      findOne: jest.fn().mockResolvedValue({
        id: 'participant-2',
        role: ParticipantRole.Member,
      }),
    })
    await expect(
      service.updateCoursePlan('meeting-1', 'member-token', {
        categorySlugs: [CategorySlug.Cafe],
        version: 2,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('모임·기준 위치·코스·호스트 참여자·수집 작업을 하나의 transaction에서 만든다', async () => {
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
      findOne: jest.fn().mockResolvedValue(null),
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
      categorySteps: [{ id: 'step-1', slug: CategorySlug.Cafe }],
    })
    expect(dataSource.transaction).toHaveBeenCalledTimes(1)
    expect(placeSyncService.createJobs).toHaveBeenCalledWith(
      manager,
      meeting,
      location,
      [category],
    )
  })

  it('기준 위치 변경 시 이전 작업을 무효화하고 새 버전 작업을 등록한다', async () => {
    const { service, dataSource, placeSyncService } = createMeetingService()
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
    const participantRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'participant-1', role: 'HOST' }),
    }
    const locationRepository = {
      findOne: jest.fn().mockResolvedValue(location),
      save: jest.fn().mockResolvedValue(updatedLocation),
    }
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
      [MeetingParticipant, participantRepository],
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
    expect(placeSyncService.createJobs).toHaveBeenCalledWith(
      manager,
      meeting,
      updatedLocation,
      [category],
    )
  })

  it('선택한 코스의 반경 내 장소만 중복 없이 추천한다', async () => {
    const {
      service,
      dataSource,
      participantRepository,
      placeRepository,
      recommendationRepository,
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
    participantRepository.findOne.mockResolvedValue(participant)
    placeRepository.findOne.mockResolvedValue(place)
    recommendationRepository.findOne.mockResolvedValue(null)
    recommendationRepository.save.mockImplementation((value) =>
      Promise.resolve({ id: 'recommendation-1', ...value }),
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
    })

    recommendationRepository.findOne.mockResolvedValue({ id: 'existing' })
    await expect(
      service.addRecommendation('meeting-1', 'participant-token', {
        placeId: 'place-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })
})
