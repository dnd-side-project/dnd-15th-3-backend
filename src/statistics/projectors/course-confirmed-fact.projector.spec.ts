import { CourseGenerationCustomizationType } from 'src/course/enums/course-generation-customization-type.enum'
import { QuestionnaireSource } from 'src/questionnaire/enums/questionnaire-source.enum'
import {
  QuestionnaireDimensionCode,
  QuestionnaireOptionCode,
} from 'src/questionnaire/questionnaire.constants'
import { projectCourseConfirmedFacts } from './course-confirmed-fact.projector'

const commonPayload = {
  meetingId: '10',
  meetingTypeId: '2',
  meetingDate: '2026-08-22',
  meetingTime: '18:30:00',
  courseVersion: 1,
  participantCount: 3,
  places: [
    { placeId: '100', placeCategoryId: '20', likeCount: 2, dislikeCount: 1 },
  ],
}

describe('projectCourseConfirmedFacts', () => {
  it('v1 이벤트도 장소 사실 row로 재구성할 수 있다', () => {
    const result = projectCourseConfirmedFacts('501', {
      ...commonPayload,
      payloadVersion: 1,
    })

    expect(result.placeSelections).toEqual([
      {
        outboxEventId: '501',
        placeId: '100',
        placeCategoryId: '20',
        meetingId: '10',
        meetingTypeId: '2',
        meetingDate: '2026-08-22',
        meetingTime: '18:30:00',
        courseVersion: 1,
        participantCount: 3,
        likeCount: 2,
        dislikeCount: 1,
        courseGenerationRunId: null,
        courseGenerationCustomizationType: null,
        courseGenerationInputHash: null,
      },
    ])
    expect(result.questionnaireAnswers).toEqual([])
  })

  it('v2 이벤트의 질문 응답을 별도 사실 row로 투영한다', () => {
    const inputHash = 'a'.repeat(64)
    const result = projectCourseConfirmedFacts('502', {
      ...commonPayload,
      payloadVersion: 2,
      courseGeneration: {
        runId: '30',
        inputHash,
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
    })

    expect(result.questionnaireAnswers).toEqual([
      {
        outboxEventId: '502',
        questionCode: QuestionnaireDimensionCode.primaryPurpose,
        questionText: '목적은?',
        optionCode: QuestionnaireOptionCode.conversation,
        optionLabel: '대화',
        meetingId: '10',
        courseGenerationRunId: '30',
        questionnaireId: '40',
        courseVersion: 1,
        questionnaireVersion: 1,
        questionnaireSchemaVersion: 1,
        questionnairePromptVersion: 1,
        questionnaireSource: QuestionnaireSource.Llm,
        questionnaireProvider: 'openai',
        questionnaireModel: 'test-model',
        inputHash,
      },
      expect.objectContaining({
        questionCode: QuestionnaireDimensionCode.coursePace,
        questionText: '속도는?',
        optionCode: QuestionnaireOptionCode.relaxed,
        optionLabel: '여유',
      }),
      expect.objectContaining({
        questionCode: QuestionnaireDimensionCode.atmosphere,
        questionText: '분위기는?',
        optionCode: QuestionnaireOptionCode.cozy,
        optionLabel: '아늑함',
      }),
    ])
    expect(result.placeSelections[0]).toEqual(
      expect.objectContaining({
        courseGenerationRunId: '30',
        courseGenerationCustomizationType:
          CourseGenerationCustomizationType.Questionnaire,
        courseGenerationInputHash: inputHash,
      }),
    )
  })

  it('v2 SKIP은 질문 응답 없이도 legacy와 구분할 수 있다', () => {
    const inputHash = 'b'.repeat(64)
    const result = projectCourseConfirmedFacts('503', {
      ...commonPayload,
      payloadVersion: 2,
      courseGeneration: {
        runId: '31',
        inputHash,
        customizationType: CourseGenerationCustomizationType.Skip,
        questionnaire: null,
      },
    })

    expect(result.placeSelections[0]).toEqual(
      expect.objectContaining({
        courseGenerationRunId: '31',
        courseGenerationCustomizationType:
          CourseGenerationCustomizationType.Skip,
        courseGenerationInputHash: inputHash,
      }),
    )
    expect(result.questionnaireAnswers).toEqual([])
  })
})
