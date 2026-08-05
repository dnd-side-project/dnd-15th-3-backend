import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { storageObjectKeySchema } from 'src/storage/schemas/storage-request.schema'
import { z } from 'zod'
import { MeetingTypeCode } from '../enums/meeting-type-code.enum'

const meetingTypeCodeSchema = z.enum(
  Object.values(MeetingTypeCode) as [MeetingTypeCode, ...MeetingTypeCode[]],
)

const categorySlugSchema = z.enum(
  Object.values(CategorySlug) as [CategorySlug, ...CategorySlug[]],
)

const participantProfileSchema = z
  .object({
    userKey: z.string().trim().min(1).max(128),
    nickname: z.string().trim().min(1).max(50),
    profileImageKey: storageObjectKeySchema.optional(),
  })
  .strict()

const invitationCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{6}$/, '초대 코드는 영문 대문자와 숫자 6자리여야 합니다.')

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.')
  .refine(
    (value) => {
      const [year, month, day] = value.split('-').map(Number)
      const date = new Date(Date.UTC(year, month - 1, day))
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      )
    },
    { message: '존재하지 않는 날짜입니다.' },
  )

const timeSchema = z
  .string()
  .trim()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, '시간은 HH:mm 형식이어야 합니다.')

const createCategorySlugsSchema = z
  .array(categorySlugSchema)
  .min(1)
  .max(MAX_COURSE_STEPS)
  .refine((values) => new Set(values).size === values.length, {
    message: '카테고리는 중복해서 선택할 수 없습니다.',
  })

const updateCategorySlugsSchema = z
  .array(categorySlugSchema)
  .max(MAX_COURSE_STEPS)
  .refine((values) => new Set(values).size === values.length, {
    message: '카테고리는 중복해서 선택할 수 없습니다.',
  })

export const createMeetingRequestSchema = z
  .object({
    meetingTypeCode: meetingTypeCodeSchema,
    name: z.string().trim().min(1).max(100),
    date: dateSchema,
    time: timeSchema,
    firstLocationPlaceId: z.string().trim().min(1).max(100),
    categorySlugs: createCategorySlugsSchema,
    host: participantProfileSchema,
  })
  .strict()

export const joinMeetingRequestSchema = participantProfileSchema
  .extend({ accessToken: invitationCodeSchema })
  .strict()

export const invitationPreviewRequestSchema = z
  .object({ accessToken: invitationCodeSchema })
  .strict()

export const updateCoursePlanRequestSchema = z
  .object({
    categorySlugs: updateCategorySlugsSchema,
    version: z.number().int().min(1),
  })
  .strict()

export type CreateMeetingRequest = z.output<typeof createMeetingRequestSchema>
export type JoinMeetingRequest = z.output<typeof joinMeetingRequestSchema>
export type InvitationPreviewRequest = z.output<
  typeof invitationPreviewRequestSchema
>
export type UpdateCoursePlanRequest = z.output<
  typeof updateCoursePlanRequestSchema
>
