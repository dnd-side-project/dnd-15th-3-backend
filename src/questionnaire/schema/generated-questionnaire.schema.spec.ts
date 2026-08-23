import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from '../questionnaire.constants'
import { generatedFollowUpQuestionnaireSchema } from './generated-questionnaire.schema'

type MutableQuestionnaire = {
  questions: Array<{
    dimensionCode: string
    text: string
    options: Array<{
      semanticCode: string
      emoji: string
      label: string
    }>
  }>
}

const validQuestionnaire: MutableQuestionnaire = {
  questions: [
    {
      dimensionCode: QuestionnaireDimensionCode.coursePace,
      text: '토요일 저녁 코스는 어떤 흐름으로 즐기고 싶나요?',
      options: [
        {
          semanticCode: QuestionnaireOptionCode.relaxed,
          emoji: '☕',
          label: '적은 곳에서 오래 머무르기',
        },
        {
          semanticCode: QuestionnaireOptionCode.efficient,
          emoji: '🚶',
          label: '가까운 곳끼리 편하게 이동하기',
        },
        {
          semanticCode: QuestionnaireOptionCode.fullSchedule,
          emoji: '🗺️',
          label: '여러 곳을 알차게 둘러보기',
        },
        {
          semanticCode: QuestionnaireOptionCode.flexible,
          emoji: '🎲',
          label: '상황에 따라 코스를 바꾸기',
        },
      ],
    },
    {
      dimensionCode: QuestionnaireDimensionCode.atmosphere,
      text: '음식점·카페 코스 장소는 어떤 분위기가 가장 끌리나요?',
      options: [
        {
          semanticCode: QuestionnaireOptionCode.quiet,
          emoji: '🌿',
          label: '대화하기 좋은 조용한 곳',
        },
        {
          semanticCode: QuestionnaireOptionCode.cozy,
          emoji: '🛋️',
          label: '편안하고 아늑한 곳',
        },
        {
          semanticCode: QuestionnaireOptionCode.lively,
          emoji: '🎉',
          label: '활기와 에너지가 넘치는 곳',
        },
        {
          semanticCode: QuestionnaireOptionCode.scenic,
          emoji: '🌇',
          label: '풍경이나 사진이 예쁜 곳',
        },
      ],
    },
  ],
}

describe('generatedFollowUpQuestionnaireSchema', () => {
  it('2개 후속 차원과 차원별 4개 선택지를 통과시킨다', () => {
    expect(
      generatedFollowUpQuestionnaireSchema.safeParse(validQuestionnaire)
        .success,
    ).toBe(true)
  })

  it('질문 차원이 중복되면 거부한다', () => {
    const duplicated = structuredClone(validQuestionnaire)
    duplicated.questions[1].dimensionCode =
      QuestionnaireDimensionCode.coursePace

    expect(
      generatedFollowUpQuestionnaireSchema.safeParse(duplicated).success,
    ).toBe(false)
  })

  it('고정 첫 질문 차원은 후속 질문으로 생성하지 못한다', () => {
    const primaryPurpose = structuredClone(validQuestionnaire)
    primaryPurpose.questions[0].dimensionCode =
      QuestionnaireDimensionCode.primaryPurpose

    expect(
      generatedFollowUpQuestionnaireSchema.safeParse(primaryPurpose).success,
    ).toBe(false)
  })

  it('질문 차원에 맞지 않는 선택지 코드를 거부한다', () => {
    const mismatched = structuredClone(validQuestionnaire)
    mismatched.questions[0].options[0].semanticCode =
      QuestionnaireOptionCode.conversation

    expect(
      generatedFollowUpQuestionnaireSchema.safeParse(mismatched).success,
    ).toBe(false)
  })

  it('단어 수준으로 짧은 선택지를 거부한다', () => {
    const vague = structuredClone(validQuestionnaire)
    vague.questions[0].options[0].label = '느긋한'

    expect(generatedFollowUpQuestionnaireSchema.safeParse(vague).success).toBe(
      false,
    )
  })

  it('물음표로 끝나지 않는 질문을 거부한다', () => {
    const statement = structuredClone(validQuestionnaire)
    statement.questions[0].text = '토요일 저녁 코스의 흐름을 선택해 주세요'

    expect(
      generatedFollowUpQuestionnaireSchema.safeParse(statement).success,
    ).toBe(false)
  })

  it('후속 질문 차원 순서가 바뀌면 거부한다', () => {
    const reversed = structuredClone(validQuestionnaire)
    reversed.questions.reverse()

    expect(
      generatedFollowUpQuestionnaireSchema.safeParse(reversed).success,
    ).toBe(false)
  })
})
