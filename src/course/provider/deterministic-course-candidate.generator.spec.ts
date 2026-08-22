import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from 'src/questionnaire/questionnaire.constants'
import type { CourseGenerationInputSnapshot } from '../schema/course-generation-input.schema'
import { DeterministicCourseCandidateGenerator } from './deterministic-course-candidate.generator'

function createInput(
  answers: CourseGenerationInputSnapshot['questionnaire'] = null,
): CourseGenerationInputSnapshot {
  return {
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
    participantCount: 4,
    categorySteps: [
      { order: 1, categoryId: '10', categorySlug: CategorySlug.Restaurant },
      { order: 2, categoryId: '20', categorySlug: CategorySlug.Cafe },
    ],
    recommendations: [
      {
        recommendationId: '101',
        placeId: '1001',
        placeCategoryId: '10',
        categorySlug: CategorySlug.Restaurant,
        name: '가까운 식당',
        address: '주소 1',
        latitude: 37.5001,
        longitude: 127.0001,
        likeCount: 3,
        dislikeCount: 0,
      },
      {
        recommendationId: '102',
        placeId: '1002',
        placeCategoryId: '10',
        categorySlug: CategorySlug.Restaurant,
        name: '새로운 식당',
        address: '주소 2',
        latitude: 37.51,
        longitude: 127.01,
        likeCount: 0,
        dislikeCount: 0,
      },
      {
        recommendationId: '201',
        placeId: '2001',
        placeCategoryId: '20',
        categorySlug: CategorySlug.Cafe,
        name: '인기 카페',
        address: '주소 3',
        latitude: 37.5101,
        longitude: 127.0101,
        likeCount: 3,
        dislikeCount: 0,
      },
      {
        recommendationId: '202',
        placeId: '2002',
        placeCategoryId: '20',
        categorySlug: CategorySlug.Cafe,
        name: '새로운 카페',
        address: '주소 4',
        latitude: 37.5002,
        longitude: 127.0002,
        likeCount: 0,
        dislikeCount: 0,
      },
    ],
    questionnaire: answers,
  }
}

describe('DeterministicCourseCandidateGenerator', () => {
  it('질문 응답이 없으면 취향 점수와 이동거리 기준 후보를 만든다', async () => {
    const generator = new DeterministicCourseCandidateGenerator()

    const result = await generator.generate(createInput())

    expect(result.candidates).toEqual([
      {
        name: '모두의 취향 코스',
        recommendationIds: ['101', '201'],
      },
      {
        name: '가까운 동선 코스',
        recommendationIds: ['101', '202'],
      },
    ])
  })

  it('새로운 경험·효율·아늑함 응답을 선택 전략과 이름에 반영한다', async () => {
    const generator = new DeterministicCourseCandidateGenerator()
    const questionnaire: NonNullable<
      CourseGenerationInputSnapshot['questionnaire']
    > = {
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
          questionText: '목적',
          optionCode: QuestionnaireOptionCode.newExperience,
          optionLabel: '새로운 경험',
        },
        {
          questionCode: QuestionnaireDimensionCode.coursePace,
          questionText: '속도',
          optionCode: QuestionnaireOptionCode.efficient,
          optionLabel: '효율',
        },
        {
          questionCode: QuestionnaireDimensionCode.atmosphere,
          questionText: '분위기',
          optionCode: QuestionnaireOptionCode.cozy,
          optionLabel: '아늑함',
        },
      ],
    }

    const result = await generator.generate(createInput(questionnaire))

    expect(result.candidates[0]).toEqual({
      name: '아늑한 취향 코스',
      recommendationIds: ['102', '202'],
    })
    expect(result.candidates[1]).toEqual({
      name: '빠른 동선 코스',
      recommendationIds: ['101', '202'],
    })
  })
})
