import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import {
  createMeetingRequestSchema,
  invitationPreviewRequestSchema,
  joinMeetingRequestSchema,
  updateCoursePlanRequestSchema,
  updateMeetingDetailsRequestSchema,
} from './meeting-request.schema'

describe('meeting request schemas', () => {
  const fixedToday = new Date('2026-01-01T00:00:00.000Z')

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedToday)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('초대 코드를 대문자로 정규화한다', () => {
    expect(
      invitationPreviewRequestSchema.parse({ invitationCode: ' abc234 ' }),
    ).toEqual({ invitationCode: 'ABC234' })
  })

  it('accessToken을 초대 코드 필드로 허용하지 않는다', () => {
    expect(
      invitationPreviewRequestSchema.safeParse({ accessToken: 'ABC234' })
        .success,
    ).toBe(false)
  })

  it('초대 코드와 참여자 프로필로 모임 참여 요청을 검증한다', () => {
    expect(
      joinMeetingRequestSchema.parse({
        invitationCode: 'ABC234',
        userKey: 'device-1',
        nickname: '모모',
        profileAvatarId: ProfileAvatarId.MomoBlue,
      }),
    ).toMatchObject({ invitationCode: 'ABC234' })
  })

  it('코스는 같은 카테고리를 다시 선택할 수 있다', () => {
    const parsed = createMeetingRequestSchema.parse({
      meetingTypeCode: MeetingTypeCode.Social,
      name: '성수 브런치 모임',
      date: '2026-08-23',
      time: '12:00',
      firstMeetingLocation: {
        displayName: '성수역',
        address: '서울 성동구',
        latitude: 37.5446,
        longitude: 127.0559,
        externalAddressId: 'kakao-address-1',
      },
      categorySlugs: [CategorySlug.Cafe, CategorySlug.Cafe],
      host: {
        userKey: 'device-1',
        nickname: '모모',
        profileAvatarId: ProfileAvatarId.MomoBlue,
      },
    })

    expect(parsed.categorySlugs).toEqual([CategorySlug.Cafe, CategorySlug.Cafe])
  })

  it('코스 계획 수정은 빈 배열을 허용하지만 모임 생성은 허용하지 않는다', () => {
    expect(
      updateCoursePlanRequestSchema.parse({ categorySlugs: [], version: 1 }),
    ).toEqual({ categorySlugs: [], version: 1 })

    expect(() =>
      createMeetingRequestSchema.shape.categorySlugs.parse([]),
    ).toThrow()
    expect(
      updateCoursePlanRequestSchema.parse({
        categorySlugs: [CategorySlug.Cafe],
        version: 1,
      }),
    ).toMatchObject({ categorySlugs: [CategorySlug.Cafe] })
  })

  it.each([
    ['meetingTypeCode', { meetingTypeCode: MeetingTypeCode.DatingHobby }],
    ['name', { name: '저녁 모임' }],
    ['date', { date: '2026-01-02' }],
    ['time', { time: '18:30' }],
  ])('모임 기본 정보 수정은 %s 필드만 전달할 수 있다', (_, input) => {
    expect(updateMeetingDetailsRequestSchema.parse(input)).toEqual(input)
  })

  it('모임 기본 정보 수정은 최소 한 필드를 요구한다', () => {
    expect(updateMeetingDetailsRequestSchema.safeParse({}).success).toBe(false)
  })

  it.each([
    ['긴 이름', { name: '열한글자모임이름입니다' }],
    ['과거 날짜', { date: '2025-12-31' }],
    ['잘못된 시간', { time: '24:00' }],
    ['잘못된 모임 유형', { meetingTypeCode: 'UNKNOWN' }],
  ])('모임 기본 정보 수정은 %s 입력을 거부한다', (_, input) => {
    expect(updateMeetingDetailsRequestSchema.safeParse(input).success).toBe(
      false,
    )
  })

  it('오늘 날짜로는 모임을 생성할 수 있다', () => {
    expect(
      createMeetingRequestSchema.shape.date.safeParse('2026-01-01').success,
    ).toBe(true)
  })

  it('미래 날짜로는 모임을 생성할 수 있다', () => {
    expect(
      createMeetingRequestSchema.shape.date.safeParse('2026-01-02').success,
    ).toBe(true)
  })

  it('과거 날짜로는 모임을 생성할 수 없다', () => {
    const result = createMeetingRequestSchema.shape.date.safeParse('2025-12-31')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        '오늘 이전 날짜로는 모임 날짜를 설정할 수 없습니다.',
      )
    }
  })
})
