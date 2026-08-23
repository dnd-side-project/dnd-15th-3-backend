import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { Place } from 'src/place/entities/place.entity'
import { PlaceSource } from 'src/place/enums/place-source.enum'
import { CourseGenerationProcessor } from './course-generation.processor'
import { CourseCandidate } from './entities/course-candidate.entity'
import { CourseCandidatePlace } from './entities/course-candidate-place.entity'
import { CourseGenerationRun } from './entities/course-generation-run.entity'
import { CourseGenerationCustomizationType } from './enums/course-generation-customization-type.enum'
import { CourseGenerationRunStatus } from './enums/course-generation-run-status.enum'
import type { CourseGenerationInputSnapshot } from './schema/course-generation-input.schema'
import type { CourseGenerationOutputSnapshot } from './schema/course-generation-output.schema'

const input: CourseGenerationInputSnapshot = {
  schemaVersion: 1,
  meeting: {
    meetingId: '10',
    meetingTypeId: '2',
    meetingTypeCode: MeetingTypeCode.Social,
    date: '2026-08-22',
    time: '18:30:00',
    courseVersion: 1,
    location: { latitude: 37.5, longitude: 127 },
  },
  participantCount: 3,
  categorySteps: [
    { order: 1, categoryId: '20', categorySlug: CategorySlug.Cafe },
  ],
  recommendations: [
    {
      recommendationId: '40',
      placeId: '50',
      placeCategoryId: '20',
      categorySlug: CategorySlug.Cafe,
      name: '카페',
      address: '서울',
      latitude: 37.5,
      longitude: 127,
      likeCount: 2,
      dislikeCount: 0,
    },
  ],
  questionnaire: null,
}

const output: CourseGenerationOutputSnapshot = {
  schemaVersion: 1,
  provider: 'internal',
  model: 'deterministic-v1',
  candidates: [{ name: '취향 코스', recommendationIds: ['40'] }],
}

function createContext() {
  const meeting = Object.assign(new Meeting(), {
    id: '10',
    status: MeetingStatus.CourseGenerating,
  })
  const run = Object.assign(new CourseGenerationRun(), {
    id: '70',
    status: CourseGenerationRunStatus.Processing,
    customizationType: CourseGenerationCustomizationType.Skip,
    inputSnapshot: input,
    inputHash: 'a'.repeat(64),
    outputSnapshot: null,
    errorMessage: null,
    completedAt: null,
    meeting,
  })
  const runQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(run),
  }
  const meetingQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(meeting),
  }
  const deleteQueryBuilder = {
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  }
  const runRepository = {
    findOne: jest.fn().mockResolvedValue(run),
    createQueryBuilder: jest.fn(() => runQueryBuilder),
    save: jest.fn().mockImplementation((value) => value),
  }
  const meetingRepository = {
    createQueryBuilder: jest.fn(() => meetingQueryBuilder),
    save: jest.fn().mockImplementation((value) => value),
  }
  const candidateRepository = {
    createQueryBuilder: jest.fn(() => deleteQueryBuilder),
    create: jest.fn().mockImplementation((value) => value),
    save: jest.fn().mockImplementation((value) => ({ id: '80', ...value })),
  }
  const candidatePlaceRepository = {
    create: jest.fn().mockImplementation((value) => value),
    save: jest.fn().mockImplementation((value) => value),
  }
  const placeRepository = { find: jest.fn() }
  const repositories = new Map<unknown, unknown>([
    [CourseGenerationRun, runRepository],
    [Meeting, meetingRepository],
    [CourseCandidate, candidateRepository],
    [CourseCandidatePlace, candidatePlaceRepository],
    [Place, placeRepository],
  ])
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  }
  const dataSource = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
    transaction: jest.fn((callback: (value: unknown) => unknown) =>
      callback(manager),
    ),
  }
  const generator = { generate: jest.fn().mockResolvedValue(output) }
  const routeService = {
    getLegs: jest
      .fn()
      .mockResolvedValue([
        { travelTimeToNext: null, distanceToNextMeters: null },
      ]),
  }
  const placeLiveDataService = { resolvePlaces: jest.fn() }
  const processor = new CourseGenerationProcessor(
    dataSource as never,
    generator as never,
    routeService as never,
    placeLiveDataService as never,
  )

  return {
    processor,
    meeting,
    run,
    generator,
    routeService,
    runRepository,
    meetingRepository,
    candidateRepository,
    candidatePlaceRepository,
    placeRepository,
    placeLiveDataService,
    deleteQueryBuilder,
  }
}

describe('CourseGenerationProcessor', () => {
  it('생성된 후보와 경로를 하나의 트랜잭션에 저장하고 상태를 완료로 바꾴다', async () => {
    const context = createContext()

    await expect(context.processor.processRun('70')).resolves.toBe(
      MeetingStatus.CourseGenerated,
    )

    expect(context.generator.generate).toHaveBeenCalledWith(input)
    expect(context.routeService.getLegs).toHaveBeenCalledWith([
      input.recommendations[0],
    ])
    expect(context.deleteQueryBuilder.where).toHaveBeenCalledWith(
      'meeting_id = :meetingId',
      { meetingId: '10' },
    )
    expect(context.candidateRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        meeting: context.meeting,
        generationRun: context.run,
        order: 1,
        name: '취향 코스',
      }),
    )
    expect(context.candidatePlaceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        order: 1,
        travelTimeToNext: null,
        distanceToNextMeters: null,
      }),
    )
    expect(context.run.status).toBe(CourseGenerationRunStatus.Succeeded)
    expect(context.run.outputSnapshot).toEqual(output)
    expect(context.meeting.status).toBe(MeetingStatus.CourseGenerated)
  })

  it('Kakao reference는 작업 실행 시 최신 장소 정보로 해석한 뒤 후보를 만든다', async () => {
    const context = createContext()
    context.run.inputSnapshot = {
      ...input,
      recommendations: [
        {
          recommendationId: '40',
          placeId: '50',
          placeCategoryId: '20',
          categorySlug: CategorySlug.Cafe,
          likeCount: 2,
          dislikeCount: 0,
          source: PlaceSource.Kakao,
          providerPlaceId: '12345',
          placeUrl: 'https://place.map.kakao.com/12345',
        },
      ],
    }
    const place = {
      id: '50',
      source: PlaceSource.Kakao,
      providerPlaceId: '12345',
      category: { id: '20', slug: CategorySlug.Cafe },
    }
    context.placeRepository.find.mockResolvedValue([place])
    context.placeLiveDataService.resolvePlaces.mockResolvedValue(
      new Map([
        [
          '50',
          {
            ...place,
            name: '성수 카페',
            address: '서울 성동구',
            latitude: 37.501,
            longitude: 127.001,
          },
        ],
      ]),
    )

    await expect(context.processor.processRun('70')).resolves.toBe(
      MeetingStatus.CourseGenerated,
    )

    expect(context.generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        recommendations: [
          expect.objectContaining({
            providerPlaceId: '12345',
            name: '성수 카페',
            latitude: 37.501,
            longitude: 127.001,
          }),
        ],
      }),
    )
  })

  it('생성 결과가 입력 스냅샷과 다르면 run과 모임을 실패 상태로 전환한다', async () => {
    const context = createContext()
    context.generator.generate.mockResolvedValue({
      ...output,
      candidates: [{ name: '잘못된 코스', recommendationIds: ['999'] }],
    })

    await expect(context.processor.processRun('70')).resolves.toBe(
      MeetingStatus.CourseGenerationFailed,
    )

    expect(context.candidateRepository.save).not.toHaveBeenCalled()
    expect(context.run.status).toBe(CourseGenerationRunStatus.Failed)
    expect(context.run.outputSnapshot).toBeNull()
    expect(context.run.errorMessage).toContain(
      'Generated course recommendation is invalid',
    )
    expect(context.meeting.status).toBe(MeetingStatus.CourseGenerationFailed)
    expect(context.runRepository.save).toHaveBeenCalledWith(context.run)
    expect(context.meetingRepository.save).toHaveBeenCalledWith(context.meeting)
  })
})
