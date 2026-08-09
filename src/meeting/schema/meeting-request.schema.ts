import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { z } from 'zod'

const enumValues = <T extends string>(values: readonly T[]) =>
  z.enum(values as [T, ...T[]])

const categorySlugSchema = enumValues(Object.values(CategorySlug))
const meetingTypeCodeSchema = enumValues(Object.values(MeetingTypeCode))
const profileAvatarIdSchema = enumValues(Object.values(ProfileAvatarId))

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
  }, '존재하지 않는 날짜입니다.')

const timeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, '시간은 HH:mm 형식이어야 합니다.')
  .refine((value) => {
    const [hour, minute] = value.split(':').map(Number)
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
  }, '존재하지 않는 시간입니다.')

export const participantProfileSchema = z.object({
  userKey: z
    .string()
    .trim()
    .min(1, '사용자 키를 입력해주세요.')
    .max(255, '사용자 키는 255자 이하이어야 합니다.'),
  nickname: z
    .string()
    .trim()
    .min(1, '닉네임을 입력해주세요.')
    .max(10, '닉네임은 10자 이하이어야 합니다.'),
  profileAvatarId: profileAvatarIdSchema,
})

export const meetingLocationSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, '첫 만남 위치명을 입력해주세요.')
    .max(100, '첫 만남 위치명은 100자 이하이어야 합니다.'),
  address: z
    .string()
    .trim()
    .min(1, '첫 만남 주소를 입력해주세요.')
    .max(255, '첫 만남 주소는 255자 이하이어야 합니다.'),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  externalAddressId: z.string().trim().min(1).max(255).nullable().optional(),
})

const courseSlugsSchema = z
  .array(categorySlugSchema)
  .max(
    MAX_COURSE_STEPS,
    `코스는 최대 ${MAX_COURSE_STEPS}개까지 선택할 수 있습니다.`,
  )

const requiredCourseSlugsSchema = courseSlugsSchema.min(
  1,
  '코스를 하나 이상 선택해주세요.',
)

const invitationCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, '초대 코드는 6자리 영문 대문자·숫자여야 합니다.')

export const createMeetingRequestSchema = z.object({
  meetingTypeCode: meetingTypeCodeSchema,
  name: z
    .string()
    .trim()
    .min(1, '모임 이름을 입력해주세요.')
    .max(10, '모임 이름은 10자 이하이어야 합니다.'),
  date: dateSchema,
  time: timeSchema,
  firstMeetingLocation: meetingLocationSchema,
  categorySlugs: requiredCourseSlugsSchema,
  host: participantProfileSchema,
})

export const invitationPreviewRequestSchema = z.object({
  invitationCode: invitationCodeSchema,
})

export const joinMeetingRequestSchema = invitationPreviewRequestSchema.and(
  participantProfileSchema,
)

export const updateCoursePlanRequestSchema = z.object({
  categorySlugs: courseSlugsSchema,
  version: z.number().int().min(1, '코스 버전은 1 이상이어야 합니다.'),
})

export type ParticipantProfileInput = z.infer<typeof participantProfileSchema>
export type MeetingLocationInput = z.infer<typeof meetingLocationSchema>
export type CreateMeetingRequest = z.infer<typeof createMeetingRequestSchema>
export type InvitationPreviewRequest = z.infer<
  typeof invitationPreviewRequestSchema
>
export type JoinMeetingRequest = z.infer<typeof joinMeetingRequestSchema>
export type UpdateCoursePlanRequest = z.infer<
  typeof updateCoursePlanRequestSchema
>
