import type { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import type { QuestionnaireSource } from '../enums/questionnaire-source.enum'
import type { GeneratedQuestion } from '../schema/generated-questionnaire.schema'

export type QuestionnaireGenerationContext = {
  meetingName: string
  meetingTypeCode: MeetingTypeCode
  meetingTypeName: string
  schedule: {
    date: string
    time: string
    dayOfWeek: string
    dayType: '평일' | '주말'
    timePeriod: '새벽' | '오전' | '오후' | '저녁' | '밤'
  }
  courseCategories: Array<{
    order: number
    slug: CategorySlug
    name: string
  }>
  recommendedPlaceCategories: Array<{
    slug: CategorySlug
    name: string
    count: number
  }>
}

export type QuestionnaireGenerationResult = {
  questions: GeneratedQuestion[]
  source: QuestionnaireSource
  provider: string
  model: string
}

export interface QuestionnaireGenerator {
  generate(
    context: QuestionnaireGenerationContext,
  ): Promise<QuestionnaireGenerationResult>
}
