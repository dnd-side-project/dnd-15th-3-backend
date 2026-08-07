import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import {
  createMeetingRequestSchema,
  invitationPreviewRequestSchema,
  joinMeetingRequestSchema,
} from './meeting-request.schema'

describe('meeting request schemas', () => {
  it('accepts invitationCode for invitation preview', () => {
    expect(
      invitationPreviewRequestSchema.parse({ invitationCode: 'DNDFOR' }),
    ).toEqual({ invitationCode: 'DNDFOR' })
  })

  it('does not accept accessToken as an invitation code', () => {
    expect(
      invitationPreviewRequestSchema.safeParse({ accessToken: 'DNDFOR' })
        .success,
    ).toBe(false)
  })

  it('accepts invitationCode with the participant profile for joining', () => {
    expect(
      joinMeetingRequestSchema.parse({
        invitationCode: 'DNDFOR',
        userKey: 'device-1',
        nickname: '모모',
        profileAvatarId: 'momo-blue',
      }),
    ).toMatchObject({ invitationCode: 'DNDFOR' })
  })

  it('accepts duplicate category slugs because a course may revisit a category', () => {
    const parsed = createMeetingRequestSchema.parse({
      meetingTypeCode: MeetingTypeCode.Social,
      name: '성수 브런치 모임',
      date: '2026-08-23',
      time: '12:00',
      firstLocationPlaceId: '101',
      categorySlugs: [CategorySlug.Cafe, CategorySlug.Cafe],
      host: {
        userKey: 'device-1',
        nickname: '모모',
        profileAvatarId: ProfileAvatarId.MomoBlue,
      },
    })

    expect(parsed.categorySlugs).toEqual([CategorySlug.Cafe, CategorySlug.Cafe])
  })
})
