import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { z } from 'zod'

const BIGINT_MAX = 9223372036854775807n

const idString = z
  .string()
  .regex(/^[1-9]\d*$/)
  .refine((value) => !/^\d+$/.test(value) || BigInt(value) <= BIGINT_MAX, {
    message: 'id는 64비트 정수(bigint) 범위를 넘을 수 없습니다',
  })

export const CourseConfirmedPayloadSchema = z
  .object({
    meetingId: idString,
    // MEETING_PREFERRED 태그(모임 유형별 선택률) 계산에 쓰이는 모임 유형(meetingType) 참조값.
    meetingTypeId: idString,
    // 주말/평일 통계 계산용 원본 날짜. 주말 여부는 미리 계산해서 넣지 않고 날짜를 유지
    // 날짜 정보를 이용해 추가 활용 가능(Ex.겨울에 많이 방문하는 장소)
    meetingDate: z.iso.date(),
    // 시간대별 통계(Ex. 저녁 모임 선호 장소)가 나중에 필요해져도 재계산 가능하도록 원본 시간을 유지
    meetingTime: z.iso.time({ precision: 0 }),
    // 코스 재확정 기능이 추가될 경우 같은 meetingId로 이벤트가 또 발생할 수 있어, 최신 버전만 집계하도록 구분하는 값
    courseVersion: z.number().int().min(1),
    // 이 payload 구조 자체의 버전. 나중에 필드가 바뀌어도 이미 저장된 옛날 이벤트를 버전별로 구분해 파싱하기 위함
    payloadVersion: z.literal(1),
    participantCount: z.number().int().min(1),
    places: z
      .array(
        z
          .object({
            placeId: idString,
            placeCategoryId: idString,
            likeCount: z.number().int().min(0),
            dislikeCount: z.number().int().min(0),
          })
          .strict(),
      )
      // 코스는 최소 1개, 최대 MAX_COURSE_STEPS개의 장소로 구성
      .min(1)
      .max(MAX_COURSE_STEPS)
      // 같은 장소가 한 코스에 중복 포함될 수 없음
      .refine(
        (places) =>
          new Set(places.map((place) => place.placeId)).size === places.length,
        { message: '같은 장소가 한 코스에 중복될 수 없습니다' },
      ),
  })
  .strict()
  // 참여자 한 명은 한 장소에 좋아요/싫어요 중 하나만 남길 수 있음
  .superRefine((data, ctx) => {
    data.places.forEach((place, index) => {
      if (place.likeCount + place.dislikeCount > data.participantCount) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', index],
          message:
            '각 장소의 좋아요와 싫어요의 합은 참여 인원 수를 넘을 수 없습니다',
        })
      }
    })
  })

export type CourseConfirmedPayload = z.infer<
  typeof CourseConfirmedPayloadSchema
>
