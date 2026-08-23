import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from 'src/questionnaire/questionnaire.constants'
import { courseGenerationInputSchema } from './course-generation-input.schema'

const validInput = {
  schemaVersion: 1,
  meeting: {
    meetingId: '1',
    meetingTypeId: '2',
    meetingTypeCode: MeetingTypeCode.Social,
    date: '2026-08-22',
    time: '18:30:00',
    courseVersion: 1,
    location: { latitude: 37.5, longitude: 127 },
  },
  participantCount: 3,
  categorySteps: [
    { order: 1, categoryId: '10', categorySlug: CategorySlug.Cafe },
  ],
  recommendations: [
    {
      recommendationId: '100',
      placeId: '1000',
      placeCategoryId: '10',
      categorySlug: CategorySlug.Cafe,
      name: '카페',
      address: '서울',
      latitude: 37.5,
      longitude: 127,
      likeCount: 2,
      dislikeCount: 0,
    },
  ],
  questionnaire: {
    questionnaireId: '30',
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
}

describe('courseGenerationInputSchema', () => {
  it('질문 생성 출처와 실제 문구까지 불변 스냅샷으로 검증한다', () => {
    expect(courseGenerationInputSchema.safeParse(validInput).success).toBe(true)
  })

  it('질문 차원과 선택지 코드가 어긋나면 거부한다', () => {
    const invalidInput = structuredClone(validInput)
    invalidInput.questionnaire.answers[0].optionCode =
      QuestionnaireOptionCode.relaxed

    expect(courseGenerationInputSchema.safeParse(invalidInput).success).toBe(
      false,
    )
  })

  it('세 차원의 응답을 하나씩 모두 포함해야 한다', () => {
    const invalidInput = structuredClone(validInput)
    invalidInput.questionnaire.answers[1].questionCode =
      QuestionnaireDimensionCode.primaryPurpose

    expect(courseGenerationInputSchema.safeParse(invalidInput).success).toBe(
      false,
    )
  })
})
