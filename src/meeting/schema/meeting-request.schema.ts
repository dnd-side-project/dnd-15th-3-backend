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
  userKey: z.string().trim().min(1, '사용자 키를 입력해주세요.'),
  nickname: z.string().trim().min(1, '닉네임을 입력해주세요.'),
  profileAvatarId: profileAvatarIdSchema,
})

const courseSlugsSchema = z
  .array(categorySlugSchema)
  .min(1, '코스를 하나 이상 선택해주세요.')
  .max(
    MAX_COURSE_STEPS,
    `코스는 최대 ${MAX_COURSE_STEPS}개까지 선택할 수 있습니다.`,
  )

export const createMeetingRequestSchema = z.object({
  meetingTypeCode: meetingTypeCodeSchema,
  name: z.string().trim().min(1, '모임 이름을 입력해주세요.'),
  date: dateSchema,
  time: timeSchema,
  firstLocationPlaceId: z
    .string()
    .trim()
    .min(1, '첫 만남 장소를 선택해주세요.'),
  categorySlugs: courseSlugsSchema,
  host: participantProfileSchema,
})

export const invitationPreviewRequestSchema = z.object({
  // 형식이 맞지 않는 비어 있지 않은 코드는 "없는 초대 코드"로 처리해
  // 초대 코드 오타와 존재하지 않는 코드를 동일한 404 흐름으로 보낸다.
  invitationCode: z.string().trim().min(1, '초대 코드를 입력해주세요.'),
})

export const joinMeetingRequestSchema = invitationPreviewRequestSchema.and(
  participantProfileSchema,
)

export type ParticipantProfileInput = z.infer<typeof participantProfileSchema>
export type CreateMeetingRequest = z.infer<typeof createMeetingRequestSchema>
export type InvitationPreviewRequest = z.infer<
  typeof invitationPreviewRequestSchema
>
export type JoinMeetingRequest = z.infer<typeof joinMeetingRequestSchema>
