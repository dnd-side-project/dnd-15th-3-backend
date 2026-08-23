import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { QuestionnaireDimensionCode } from '../questionnaire.constants'
import { FallbackQuestionnaireGenerator } from './fallback-questionnaire.generator'

describe('FallbackQuestionnaireGenerator', () => {
  it('요일·시간대와 코스 카테고리를 질문에 반영한다', async () => {
    const result = await new FallbackQuestionnaireGenerator().generate({
      meetingName: '성수 나들이',
      meetingTypeCode: MeetingTypeCode.Social,
      meetingTypeName: '친목',
      schedule: {
        date: '2026-08-22',
        time: '18:30:00',
        dayOfWeek: '토요일',
        dayType: '주말',
        timePeriod: '저녁',
      },
      courseCategories: [
        { order: 1, slug: CategorySlug.Restaurant, name: '음식점' },
        { order: 2, slug: CategorySlug.Cafe, name: '카페' },
      ],
      recommendedPlaceCategories: [],
    })

    expect(result.questions).toEqual([
      expect.objectContaining({
        dimensionCode: QuestionnaireDimensionCode.coursePace,
        text: expect.stringContaining('토요일 저녁'),
      }),
      expect.objectContaining({
        dimensionCode: QuestionnaireDimensionCode.atmosphere,
        text: expect.stringContaining('음식점·카페'),
      }),
    ])
    for (const question of result.questions) {
      expect(question.text).toMatch(/\?$/)
      expect(question.options).toHaveLength(4)
      for (const option of question.options) {
        expect(option.label.length).toBeGreaterThanOrEqual(6)
      }
    }
  })
})
