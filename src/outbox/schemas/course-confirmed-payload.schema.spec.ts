import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CourseGenerationCustomizationType } from 'src/course/enums/course-generation-customization-type.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from 'src/questionnaire/questionnaire.constants'
import { CourseConfirmedPayloadSchema } from './course-confirmed-payload.schema'

const validPayload = {
  meetingId: '1',
  meetingTypeId: '2',
  meetingDate: '2026-08-21',
  meetingTime: '18:30:00',
  courseVersion: 1,
  payloadVersion: 1 as const,
  participantCount: 4,
  places: [
    { placeId: '10', placeCategoryId: '1', likeCount: 3, dislikeCount: 1 },
  ],
}

const validV2Payload = {
  ...validPayload,
  payloadVersion: 2 as const,
  courseGeneration: {
    runId: '30',
    inputHash: 'a'.repeat(64),
    customizationType: CourseGenerationCustomizationType.Questionnaire,
    questionnaire: {
      questionnaireId: '40',
      questionnaireVersion: 1,
      schemaVersion: 1,
      promptVersion: 1,
      source: QuestionnaireSource.Llm,
      provider: 'openai',
      model: 'test-model',
      answers: [
        {
          questionCode: QuestionnaireDimensionCode.primaryPurpose,
          questionText: '목적은?',
          optionCode: QuestionnaireOptionCode.conversation,
          optionLabel: '대화',
        },
        {
          questionCode: QuestionnaireDimensionCode.coursePace,
          questionText: '속도는?',
          optionCode: QuestionnaireOptionCode.relaxed,
          optionLabel: '여유',
        },
        {
          questionCode: QuestionnaireDimensionCode.atmosphere,
          questionText: '분위기는?',
          optionCode: QuestionnaireOptionCode.cozy,
          optionLabel: '아늑함',
        },
      ],
    },
  },
}

function parse(payload: unknown) {
  return CourseConfirmedPayloadSchema.safeParse(payload)
}

describe('CourseConfirmedPayloadSchema', () => {
  it('유효한 payload는 통과한다', () => {
    expect(parse(validPayload).success).toBe(true)
  })

  describe.each([
    ['meetingId', (id: string) => ({ ...validPayload, meetingId: id })],
    ['meetingTypeId', (id: string) => ({ ...validPayload, meetingTypeId: id })],
    [
      'placeId',
      (id: string) => ({
        ...validPayload,
        places: [{ ...validPayload.places[0], placeId: id }],
      }),
    ],
    [
      'placeCategoryId',
      (id: string) => ({
        ...validPayload,
        places: [{ ...validPayload.places[0], placeCategoryId: id }],
      }),
    ],
  ])('%s (id 문자열 검증)', (_name, withId) => {
    it.each([
      ['abc', '숫자가 아닌 문자열'],
      ['0', '0'],
      ['01', '0으로 시작하는 문자열'],
      ['', '빈 문자열'],
      ['9223372036854775808', 'bigint 최댓값을 초과하는 값'],
      ['-1', '음수'],
      ['1.5', '소수'],
    ])('%s(%s)는 거부한다', (invalidId) => {
      expect(parse(withId(invalidId)).success).toBe(false)
    })

    it('bigint 최댓값(9223372036854775807)은 통과한다', () => {
      expect(parse(withId('9223372036854775807')).success).toBe(true)
    })
  })

  describe('meetingDate', () => {
    it.each([
      ['2026/08/21', '슬래시 구분자'],
      ['2026-13-01', '존재하지 않는 월'],
      ['invalid-date', '날짜 형식이 아님'],
      ['2026-08-21T00:00:00Z', '시간까지 포함된 문자열'],
    ])('%s(%s)는 거부한다', (invalidDate) => {
      expect(parse({ ...validPayload, meetingDate: invalidDate }).success).toBe(
        false,
      )
    })

    it('YYYY-MM-DD 형식은 통과한다', () => {
      expect(
        parse({ ...validPayload, meetingDate: '2026-01-01' }).success,
      ).toBe(true)
    })
  })

  describe('meetingTime', () => {
    it.each([
      ['18:30', '초 단위 없는 문자열'],
      ['25:00:00', '존재하지 않는 시각'],
      ['invalid-time', '시간 형식이 아님'],
      ['2026-08-21', '날짜 문자열'],
    ])('%s(%s)는 거부한다', (invalidTime) => {
      expect(parse({ ...validPayload, meetingTime: invalidTime }).success).toBe(
        false,
      )
    })

    it('HH:MM:SS 형식은 통과한다', () => {
      expect(parse({ ...validPayload, meetingTime: '09:00:00' }).success).toBe(
        true,
      )
    })
  })

  describe('courseVersion', () => {
    it.each([
      [0, '0'],
      [-1, '음수'],
      [1.5, '소수'],
    ])('%s(%s)는 거부한다', (invalidVersion) => {
      expect(
        parse({ ...validPayload, courseVersion: invalidVersion }).success,
      ).toBe(false)
    })

    it('1 이상의 정수는 통과한다', () => {
      expect(parse({ ...validPayload, courseVersion: 2 }).success).toBe(true)
    })
  })

  describe('payloadVersion', () => {
    it('v1과 v2 모두 통과한다', () => {
      expect(parse(validPayload).success).toBe(true)
      expect(parse(validV2Payload).success).toBe(true)
    })

    it('알 수 없는 버전은 거부한다', () => {
      expect(parse({ ...validPayload, payloadVersion: 3 }).success).toBe(false)
    })

    it('질문 차원과 선택지 의미 코드가 다르면 거부한다', () => {
      const invalidPayload = structuredClone(validV2Payload)
      invalidPayload.courseGeneration.questionnaire.answers[0].optionCode =
        QuestionnaireOptionCode.relaxed

      expect(parse(invalidPayload).success).toBe(false)
    })

    it('SKIP 생성에 질문 응답이 포함되면 거부한다', () => {
      expect(
        parse({
          ...validV2Payload,
          courseGeneration: {
            ...validV2Payload.courseGeneration,
            customizationType: CourseGenerationCustomizationType.Skip,
          },
        }).success,
      ).toBe(false)
    })
  })

  describe('participantCount', () => {
    it.each([
      [0, '0'],
      [-1, '음수'],
      [1.5, '소수'],
    ])('%s(%s)는 거부한다', (invalidCount) => {
      expect(
        parse({ ...validPayload, participantCount: invalidCount }).success,
      ).toBe(false)
    })
  })

  describe('places 배열', () => {
    it('빈 배열은 거부한다', () => {
      expect(parse({ ...validPayload, places: [] }).success).toBe(false)
    })

    it(`${MAX_COURSE_STEPS}개를 초과하면 거부한다`, () => {
      const tooManyPlaces = Array.from(
        { length: MAX_COURSE_STEPS + 1 },
        (_, i) => ({
          placeId: String(i + 1),
          placeCategoryId: '1',
          likeCount: 0,
          dislikeCount: 0,
        }),
      )

      expect(parse({ ...validPayload, places: tooManyPlaces }).success).toBe(
        false,
      )
    })

    it(`${MAX_COURSE_STEPS}개는 통과한다`, () => {
      const maxPlaces = Array.from({ length: MAX_COURSE_STEPS }, (_, i) => ({
        placeId: String(i + 1),
        placeCategoryId: '1',
        likeCount: 0,
        dislikeCount: 0,
      }))

      expect(parse({ ...validPayload, places: maxPlaces }).success).toBe(true)
    })

    it('같은 placeId가 중복되면 거부한다', () => {
      const duplicatedPlaces = [validPayload.places[0], validPayload.places[0]]

      expect(
        parse({
          ...validPayload,
          participantCount: 8,
          places: duplicatedPlaces,
        }).success,
      ).toBe(false)
    })

    describe('장소별 likeCount, dislikeCount', () => {
      it.each([
        ['likeCount', -1],
        ['likeCount', 1.5],
        ['dislikeCount', -1],
        ['dislikeCount', 1.5],
      ])('%s에 %s가 들어오면 거부한다', (field, invalidValue) => {
        const invalidPlace = {
          ...validPayload.places[0],
          [field]: invalidValue,
        }

        expect(parse({ ...validPayload, places: [invalidPlace] }).success).toBe(
          false,
        )
      })

      it('좋아요+싫어요 합이 participantCount와 같으면 통과한다', () => {
        const place = {
          ...validPayload.places[0],
          likeCount: 3,
          dislikeCount: 1,
        }

        expect(
          parse({ ...validPayload, participantCount: 4, places: [place] })
            .success,
        ).toBe(true)
      })

      it('좋아요+싫어요 합이 participantCount를 넘으면 거부하고 해당 장소 위치를 가리킨다', () => {
        const place = {
          ...validPayload.places[0],
          likeCount: 3,
          dislikeCount: 2,
        }

        const result = parse({
          ...validPayload,
          participantCount: 4,
          places: [place],
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(['places', 0])
        }
      })

      it('여러 장소 중 하나만 상한을 넘으면 그 장소만 정확히 가리킨다', () => {
        const places = [
          {
            placeId: '10',
            placeCategoryId: '1',
            likeCount: 1,
            dislikeCount: 0,
          },
          {
            placeId: '11',
            placeCategoryId: '1',
            likeCount: 3,
            dislikeCount: 3,
          },
          {
            placeId: '12',
            placeCategoryId: '1',
            likeCount: 2,
            dislikeCount: 0,
          },
        ]

        const result = parse({ ...validPayload, participantCount: 4, places })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toHaveLength(1)
          expect(result.error.issues[0].path).toEqual(['places', 1])
        }
      })
    })
  })

  describe('타입/필수값 검증', () => {
    it('필수 필드가 없으면 거부한다', () => {
      const { meetingId, ...withoutMeetingId } = validPayload
      expect(parse(withoutMeetingId).success).toBe(false)
    })

    it('meetingId에 문자열이 아닌 숫자가 들어오면 거부한다', () => {
      expect(parse({ ...validPayload, meetingId: 1 }).success).toBe(false)
    })

    it('participantCount에 숫자가 아닌 문자열이 들어오면 거부한다', () => {
      expect(parse({ ...validPayload, participantCount: '4' }).success).toBe(
        false,
      )
    })

    it('places가 배열이 아니면 거부한다', () => {
      expect(parse({ ...validPayload, places: 'not-array' }).success).toBe(
        false,
      )
    })

    it('필드 값이 null이면 거부한다', () => {
      expect(parse({ ...validPayload, meetingId: null }).success).toBe(false)
    })
  })

  describe('알 수 없는 필드 (.strict())', () => {
    it('바깥 객체에 알 수 없는 필드가 있으면 거부한다', () => {
      expect(parse({ ...validPayload, unknownField: 'x' }).success).toBe(false)
    })

    it('장소 객체에 알 수 없는 필드가 있으면 거부한다', () => {
      const placeWithExtraField = {
        ...validPayload.places[0],
        unknownField: 'x',
      }

      expect(
        parse({ ...validPayload, places: [placeWithExtraField] }).success,
      ).toBe(false)
    })
  })
})
