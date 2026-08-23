import type { KakaoWalkingCourseService } from 'src/kakao/kakao-walking-course.service'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingException } from 'src/meeting/exception/meeting.exception'
import type { DataSource } from 'typeorm'
import { CourseCategoryStep } from '../../entities/course-category-step.entity'
import type { MeetingPlaceRecommendation } from '../../entities/meeting-place-recommendation.entity'
import type { MeetingPlaceRecommendationRepository } from '../../meeting-place-recommendation.repository'
import type { MeetingPlaceRecommendationVoteRepository } from '../../meeting-place-recommendation-vote.repository'
import { CourseGeneratorInputBuilder } from './course-generator-input.builder'

function createMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return Object.assign(new Meeting(), {
    id: 'meeting-1',
    date: '2026-08-22', // Saturday
    meetingType: { code: 'SOCIAL' },
    meetingLocation: { longitude: 127.0, latitude: 37.5 },
    ...overrides,
  })
}

function createRecommendation(
  id: string,
  placeId: string,
  categorySlug: string,
  overrides: Partial<MeetingPlaceRecommendation['place']> = {},
): MeetingPlaceRecommendation {
  return {
    id,
    place: {
      id: placeId,
      name: `place-${placeId}`,
      longitude: 127.0,
      latitude: 37.5,
      category: { slug: categorySlug },
      ...overrides,
    },
  } as unknown as MeetingPlaceRecommendation
}

function createBuilder() {
  const meetingRepository = { findOne: jest.fn() }
  const categoryStepRepository = { find: jest.fn().mockResolvedValue([]) }
  const dataSource = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Meeting) return meetingRepository
      if (entity === CourseCategoryStep) return categoryStepRepository
      throw new Error(`unexpected entity: ${String(entity)}`)
    }),
    manager: {},
  }
  const recommendationRepository = {
    findByMeeting: jest.fn().mockResolvedValue([]),
  }
  const voteRepository = {
    getVoteCountsByRecommendation: jest.fn().mockResolvedValue(new Map()),
  }
  const kakaoWalkingCourseService = {
    getWalkingCourse: jest.fn().mockResolvedValue({
      status: 'OK',
      route: { properties: { totalDistance: 100, totalTime: 100 }, legs: [] },
    }),
  }

  const builder = new CourseGeneratorInputBuilder(
    dataSource as unknown as DataSource,
    recommendationRepository as unknown as MeetingPlaceRecommendationRepository,
    voteRepository as unknown as MeetingPlaceRecommendationVoteRepository,
    kakaoWalkingCourseService as unknown as KakaoWalkingCourseService,
  )

  return {
    builder,
    meetingRepository,
    categoryStepRepository,
    recommendationRepository,
    voteRepository,
    kakaoWalkingCourseService,
  }
}

describe('CourseGeneratorInputBuilder', () => {
  it('모임을 찾을 수 없으면 MeetingException을 던진다', async () => {
    const { builder, meetingRepository } = createBuilder()
    meetingRepository.findOne.mockResolvedValue(null)

    await expect(builder.build('meeting-1')).rejects.toThrow(MeetingException)
  })

  it('시작지 정보가 없으면 예외를 던진다', async () => {
    const { builder, meetingRepository } = createBuilder()
    meetingRepository.findOne.mockResolvedValue(
      createMeeting({ meetingLocation: undefined }),
    )

    await expect(builder.build('meeting-1')).rejects.toThrow()
  })

  it('방문 순서(카테고리 단계)가 하나도 없으면 데이터 정합성 예외를 던진다', async () => {
    const { builder, meetingRepository, categoryStepRepository } =
      createBuilder()
    meetingRepository.findOne.mockResolvedValue(createMeeting())
    categoryStepRepository.find.mockResolvedValue([])

    await expect(builder.build('meeting-1')).rejects.toThrow(MeetingException)
  })

  it('카카오 API 호출이 실패(설정 오류·네트워크 오류 등)하면 그대로 전파한다', async () => {
    const {
      builder,
      meetingRepository,
      categoryStepRepository,
      recommendationRepository,
      kakaoWalkingCourseService,
    } = createBuilder()

    meetingRepository.findOne.mockResolvedValue(createMeeting())
    categoryStepRepository.find.mockResolvedValue([
      { order: 1, category: { slug: 'restaurant' } },
    ])
    recommendationRepository.findByMeeting.mockResolvedValue([
      createRecommendation('rec-1', 'place-1', 'restaurant'),
    ])
    kakaoWalkingCourseService.getWalkingCourse.mockRejectedValue(
      new Error('카카오 API 키가 설정되지 않았습니다'),
    )

    await expect(builder.build('meeting-1')).rejects.toThrow(
      '카카오 API 키가 설정되지 않았습니다',
    )
  })

  it('모임·추천 장소·투표·거리 데이터를 조합해 유효한 입력을 만든다', async () => {
    const {
      builder,
      meetingRepository,
      categoryStepRepository,
      recommendationRepository,
      voteRepository,
      kakaoWalkingCourseService,
    } = createBuilder()

    meetingRepository.findOne.mockResolvedValue(createMeeting())
    categoryStepRepository.find.mockResolvedValue([
      { order: 1, category: { slug: 'restaurant' } },
      { order: 2, category: { slug: 'cafe' } },
    ])
    recommendationRepository.findByMeeting.mockResolvedValue([
      createRecommendation('rec-1', 'place-1', 'restaurant'),
      createRecommendation('rec-2', 'place-2', 'cafe'),
    ])
    voteRepository.getVoteCountsByRecommendation.mockResolvedValue(
      new Map([
        ['rec-1', { likeCount: 3, dislikeCount: 1 }],
        ['rec-2', { likeCount: 0, dislikeCount: 0 }],
      ]),
    )
    kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue({
      status: 'OK',
      route: { properties: { totalDistance: 250, totalTime: 200 }, legs: [] },
    })

    const input = await builder.build('meeting-1')

    expect(input.meetingType).toBe('SOCIAL')
    expect(input.isWeekend).toBe(true)
    expect(input.qna).toEqual([])
    expect(input.visitOrder).toEqual(['restaurant', 'cafe'])
    expect(input.places).toEqual([
      {
        id: 'place-1',
        name: 'place-place-1',
        category: 'restaurant',
        score: 1.5, // 3 - 1*1.5
        tags: [],
      },
      {
        id: 'place-2',
        name: 'place-place-2',
        category: 'cafe',
        score: 0,
        tags: [],
      },
    ])
    expect(input.distanceMatrix.values).toEqual({
      start: { 'place-1': 250 },
      'place-1': { 'place-2': 250 },
    })
  })

  describe('선호도 점수 계산', () => {
    it.each([
      [0, 0, 0],
      [5, 0, 5],
      [0, 5, -7.5],
      [10, 1, 8.5],
      [3, 2, 0],
      [1, 1, -0.5],
    ])(
      '좋아요 %i개, 싫어요 %i개면 점수는 %f이다',
      async (likeCount, dislikeCount, expectedScore) => {
        const {
          builder,
          meetingRepository,
          categoryStepRepository,
          recommendationRepository,
          voteRepository,
        } = createBuilder()

        meetingRepository.findOne.mockResolvedValue(createMeeting())
        categoryStepRepository.find.mockResolvedValue([
          { order: 1, category: { slug: 'restaurant' } },
        ])
        recommendationRepository.findByMeeting.mockResolvedValue([
          createRecommendation('rec-1', 'place-1', 'restaurant'),
        ])
        voteRepository.getVoteCountsByRecommendation.mockResolvedValue(
          new Map([['rec-1', { likeCount, dislikeCount }]]),
        )

        const input = await builder.build('meeting-1')

        expect(input.places[0].score).toBe(expectedScore)
      },
    )

    it('싫어요 1개는 좋아요 1개보다 더 크게 깎는다 (비대칭 가중치)', async () => {
      async function scoreFor(likeCount: number, dislikeCount: number) {
        const {
          builder,
          meetingRepository,
          categoryStepRepository,
          recommendationRepository,
          voteRepository,
        } = createBuilder()

        meetingRepository.findOne.mockResolvedValue(createMeeting())
        categoryStepRepository.find.mockResolvedValue([
          { order: 1, category: { slug: 'restaurant' } },
        ])
        recommendationRepository.findByMeeting.mockResolvedValue([
          createRecommendation('rec-1', 'place-1', 'restaurant'),
        ])
        voteRepository.getVoteCountsByRecommendation.mockResolvedValue(
          new Map([['rec-1', { likeCount, dislikeCount }]]),
        )

        const input = await builder.build('meeting-1')
        return input.places[0].score
      }

      const onlyLike = await scoreFor(1, 0)
      const onlyDislike = await scoreFor(0, 1)

      expect(Math.abs(onlyDislike)).toBeGreaterThan(Math.abs(onlyLike))
    })
  })

  describe('주말 판정', () => {
    it.each([
      ['2026-08-22', true], // Saturday
      ['2026-08-23', true], // Sunday
      ['2026-08-24', false], // Monday
      ['2026-08-28', false], // Friday
    ])('%s는 주말인가? -> %s', async (date, expected) => {
      const {
        builder,
        meetingRepository,
        categoryStepRepository,
        recommendationRepository,
      } = createBuilder()
      meetingRepository.findOne.mockResolvedValue(createMeeting({ date }))
      categoryStepRepository.find.mockResolvedValue([
        { order: 1, category: { slug: 'restaurant' } },
      ])
      recommendationRepository.findByMeeting.mockResolvedValue([
        createRecommendation('rec-1', 'place-1', 'restaurant'),
      ])

      const input = await builder.build('meeting-1')

      expect(input.isWeekend).toBe(expected)
    })
  })

  it('카카오 API가 경로를 찾지 못한 쌍은 distanceMatrix에서 빠진다', async () => {
    const {
      builder,
      meetingRepository,
      categoryStepRepository,
      recommendationRepository,
      kakaoWalkingCourseService,
    } = createBuilder()

    meetingRepository.findOne.mockResolvedValue(createMeeting())
    categoryStepRepository.find.mockResolvedValue([
      { order: 1, category: { slug: 'restaurant' } },
    ])
    recommendationRepository.findByMeeting.mockResolvedValue([
      createRecommendation('rec-1', 'place-1', 'restaurant'),
    ])
    kakaoWalkingCourseService.getWalkingCourse.mockResolvedValue({
      status: 'ROUTE_RESULT_NOT_FOUND',
    })

    const input = await builder.build('meeting-1')

    expect(input.distanceMatrix.values).toEqual({})
  })
})
