import type { ConfigService } from '@nestjs/config'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { Env } from 'src/config/env'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { MockApiService } from './mock-api.service'

function createService(mockApiEnabled: boolean) {
  const config = {
    get: jest.fn().mockReturnValue(mockApiEnabled),
  } as unknown as ConfigService<Env, true>
  return new MockApiService(config)
}

describe('MockApiService', () => {
  it('returns role-specific screen data for participant access tokens', () => {
    const service = createService(true)

    expect(service.enabled).toBe(true)
    expect(service.getMeetingDetail('1', 'host-session-token')).toMatchObject({
      role: 'HOST',
      isHost: true,
      viewerParticipantId: '11',
      placeId: '101',
      permissions: expect.objectContaining({ canManageMeeting: true }),
      participants: expect.arrayContaining([
        expect.objectContaining({ role: 'HOST' }),
      ]),
      categorySteps: expect.arrayContaining([
        expect.objectContaining({ order: 1 }),
      ]),
    })

    expect(service.getMeetingDetail('1', 'member-session-token')).toMatchObject(
      {
        role: 'MEMBER',
        isHost: false,
        viewerParticipantId: '12',
        placeId: '101',
        permissions: expect.objectContaining({ canManageMeeting: false }),
      },
    )

    expect(service.getInvitationPreview('DNDFOR')).toMatchObject({
      meetingId: '1',
      accessToken: 'DNDFOR',
    })
  })

  it('filters places by keyword and category', () => {
    const service = createService(true)
    const searchPlaces = service.searchPlaces.bind(service) as (
      keyword: string,
      categoryId?: string,
    ) => Array<{ id: string }>

    expect(searchPlaces('카페').map(({ id }) => id)).toEqual(['301'])
    expect(searchPlaces('성수', '2').map(({ id }) => id)).toEqual(['302'])
    expect(searchPlaces('없는 장소')).toEqual([])
  })

  it('only joins a meeting with a valid invitation token', () => {
    const service = createService(true)
    const joinMeeting = service.joinMeeting.bind(service) as (
      accessToken: string,
    ) => { participantAccessToken: string } | undefined

    expect(joinMeeting('INVALID')).toBeUndefined()
    expect(joinMeeting('DNDFOR')).toMatchObject({
      participantAccessToken: 'member-session-token',
    })
  })

  it('does not expose fixtures unless mock mode is enabled', () => {
    const service = createService(false)

    expect(() => service.requireEnabled()).toThrow('MOCK_API_ENABLED=true')
  })

  it('returns the Figma meeting types in display order', () => {
    const service = createService(true)

    expect(service.getMeetingTypes()).toEqual([
      { id: '1', code: MeetingTypeCode.Social, name: '친목' },
      { id: '2', code: MeetingTypeCode.Dating, name: '데이트' },
      {
        id: '3',
        code: MeetingTypeCode.CompanyDinner,
        name: '회식',
      },
      { id: '4', code: MeetingTypeCode.Family, name: '가족모임' },
      { id: '5', code: MeetingTypeCode.Travel, name: '여행' },
      { id: '6', code: MeetingTypeCode.Study, name: '스터디' },
      { id: '7', code: MeetingTypeCode.Business, name: '비즈니스' },
      { id: '8', code: MeetingTypeCode.Hobby, name: '취미' },
      { id: '9', code: MeetingTypeCode.Other, name: '기타' },
    ])
  })

  it('uses the same stable code in meeting details', () => {
    const service = createService(true)

    expect(service.getMeetingDetail('1', 'host-session-token')).toMatchObject({
      meetingType: {
        id: '1',
        code: MeetingTypeCode.Social,
        name: '친목',
      },
    })
  })

  it('returns the Figma category slugs in display order', () => {
    const service = createService(true)

    expect(service.getCategories()).toEqual([
      {
        id: '2',
        name: '음식점',
        slug: CategorySlug.Restaurant,
      },
      { id: '1', name: '카페', slug: CategorySlug.Cafe },
      { id: '4', name: '술 · 바', slug: CategorySlug.Bar },
      { id: '3', name: '산책 · 야경', slug: CategorySlug.Walk },
      { id: '5', name: '팝업 · 쇼핑', slug: CategorySlug.Shopping },
      { id: '6', name: '액티비티', slug: CategorySlug.Activity },
      { id: '7', name: '문화 · 전시', slug: CategorySlug.Culture },
      { id: '8', name: '기타', slug: CategorySlug.Other },
    ])
  })

  it('returns the default ordered course plan', () => {
    const service = createService(true)

    expect(service.getCoursePlan('1', 'host-session-token')).toMatchObject({
      meetingId: '1',
      maxSteps: 6,
      version: 1,
      categorySteps: [
        expect.objectContaining({
          slug: CategorySlug.Restaurant,
          order: 1,
        }),
        expect.objectContaining({ slug: CategorySlug.Cafe, order: 2 }),
        expect.objectContaining({ slug: CategorySlug.Bar, order: 3 }),
        expect.objectContaining({ slug: CategorySlug.Walk, order: 4 }),
        expect.objectContaining({ slug: CategorySlug.Shopping, order: 5 }),
      ],
    })
  })

  it('replaces the complete course plan and increments its version', () => {
    const service = createService(true)

    const result = service.updateCoursePlan(
      '1',
      'host-session-token',
      [CategorySlug.Cafe, CategorySlug.Restaurant],
      1,
    )

    expect(result).toMatchObject({
      version: 2,
      categorySteps: [
        expect.objectContaining({ slug: CategorySlug.Cafe, order: 1 }),
        expect.objectContaining({ slug: CategorySlug.Restaurant, order: 2 }),
      ],
    })
    expect(service.getCoursePlan('1', 'host-session-token')).toMatchObject({
      version: 2,
      categorySteps: [
        expect.objectContaining({ slug: CategorySlug.Cafe, order: 1 }),
        expect.objectContaining({ slug: CategorySlug.Restaurant, order: 2 }),
      ],
    })
  })

  it('rejects duplicate categories, stale versions, and member updates', () => {
    const service = createService(true)

    expect(
      service.updateCoursePlan(
        '1',
        'host-session-token',
        [CategorySlug.Cafe, CategorySlug.Cafe],
        1,
      ),
    ).toBe('BAD_REQUEST')
    expect(
      service.updateCoursePlan(
        '1',
        'host-session-token',
        [CategorySlug.Cafe],
        0,
      ),
    ).toBe('CONFLICT')
    expect(
      service.updateCoursePlan(
        '1',
        'member-session-token',
        [CategorySlug.Cafe],
        1,
      ),
    ).toBe('FORBIDDEN')
  })
})
