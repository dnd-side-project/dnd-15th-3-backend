import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from '../enums/meeting-type-code.enum'
import {
  createMeetingRequestSchema,
  invitationPreviewRequestSchema,
  joinMeetingRequestSchema,
  updateCoursePlanRequestSchema,
} from './meeting-request.schema'

const profile = {
  userKey: 'device-1',
  nickname: '모모',
  profileImageKey: 'profiles/momo.png',
}

describe('meeting request schemas', () => {
  it('accepts a valid meeting creation request', () => {
    expect(
      createMeetingRequestSchema.parse({
        meetingTypeCode: MeetingTypeCode.Social,
        name: '성수 브런치 모임',
        date: '2026-08-23',
        time: '12:00',
        firstLocationPlaceId: '101',
        categorySlugs: [CategorySlug.Restaurant, CategorySlug.Cafe],
        host: profile,
      }),
    ).toMatchObject({ name: '성수 브런치 모임' })
  })

  it.each([
    ['missing enum', { meetingTypeCode: 'INVALID' }],
    ['invalid date', { date: '2026-02-30' }],
    ['invalid time', { time: '25:00' }],
    [
      'duplicate categories',
      { categorySlugs: [CategorySlug.Cafe, CategorySlug.Cafe] },
    ],
  ])('rejects %s', (_label, override) => {
    const input = {
      meetingTypeCode: MeetingTypeCode.Social,
      name: '성수 브런치 모임',
      date: '2026-08-23',
      time: '12:00',
      firstLocationPlaceId: '101',
      categorySlugs: [CategorySlug.Restaurant, CategorySlug.Cafe],
      host: profile,
      ...override,
    }

    expect(() => createMeetingRequestSchema.parse(input)).toThrow()
  })

  it('validates invitation and participant input separately', () => {
    expect(
      invitationPreviewRequestSchema.parse({ accessToken: 'DNDFOR' }),
    ).toEqual({ accessToken: 'DNDFOR' })
    expect(
      joinMeetingRequestSchema.parse({ ...profile, accessToken: 'DNDFOR' }),
    ).toMatchObject({ accessToken: 'DNDFOR' })
    expect(() =>
      invitationPreviewRequestSchema.parse({ accessToken: '' }),
    ).toThrow()
  })

  it('allows an empty but valid course plan and rejects duplicate values', () => {
    expect(
      updateCoursePlanRequestSchema.parse({ categorySlugs: [], version: 1 }),
    ).toEqual({ categorySlugs: [], version: 1 })
    expect(() =>
      updateCoursePlanRequestSchema.parse({
        categorySlugs: [CategorySlug.Cafe, CategorySlug.Cafe],
        version: 1,
      }),
    ).toThrow()
    expect(() =>
      updateCoursePlanRequestSchema.parse({ categorySlugs: [], version: 0 }),
    ).toThrow()
  })
})
