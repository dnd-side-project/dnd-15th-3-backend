export const QUESTIONNAIRE_QUESTION_COUNT = 3
export const QUESTIONNAIRE_GENERATED_QUESTION_COUNT = 2
export const QUESTIONNAIRE_OPTION_COUNT = 4
export const QUESTIONNAIRE_SCHEMA_VERSION = 1
export const QUESTIONNAIRE_PROMPT_VERSION = 3

export const QUESTIONNAIRE_QUESTION_TEXT_MIN_LENGTH = 12
export const QUESTIONNAIRE_QUESTION_TEXT_MAX_LENGTH = 80
export const QUESTIONNAIRE_OPTION_LABEL_MIN_LENGTH = 6
export const QUESTIONNAIRE_OPTION_LABEL_MAX_LENGTH = 40

export const QuestionnaireDimensionCode = {
  primaryPurpose: 'PRIMARY_PURPOSE',
  coursePace: 'COURSE_PACE',
  atmosphere: 'ATMOSPHERE',
} as const

export type QuestionnaireDimensionCode =
  (typeof QuestionnaireDimensionCode)[keyof typeof QuestionnaireDimensionCode]

export const QUESTIONNAIRE_FOLLOW_UP_DIMENSION_CODES = [
  QuestionnaireDimensionCode.coursePace,
  QuestionnaireDimensionCode.atmosphere,
] as const

export const QuestionnaireOptionCode = {
  conversation: 'CONVERSATION',
  newExperience: 'NEW_EXPERIENCE',
  food: 'FOOD',
  memories: 'MEMORIES',
  relaxed: 'RELAXED',
  efficient: 'EFFICIENT',
  fullSchedule: 'FULL_SCHEDULE',
  flexible: 'FLEXIBLE',
  quiet: 'QUIET',
  cozy: 'COZY',
  lively: 'LIVELY',
  scenic: 'SCENIC',
} as const

export type QuestionnaireOptionCode =
  (typeof QuestionnaireOptionCode)[keyof typeof QuestionnaireOptionCode]

export const QUESTIONNAIRE_OPTION_CODES_BY_DIMENSION = {
  [QuestionnaireDimensionCode.primaryPurpose]: [
    QuestionnaireOptionCode.conversation,
    QuestionnaireOptionCode.newExperience,
    QuestionnaireOptionCode.food,
    QuestionnaireOptionCode.memories,
  ],
  [QuestionnaireDimensionCode.coursePace]: [
    QuestionnaireOptionCode.relaxed,
    QuestionnaireOptionCode.efficient,
    QuestionnaireOptionCode.fullSchedule,
    QuestionnaireOptionCode.flexible,
  ],
  [QuestionnaireDimensionCode.atmosphere]: [
    QuestionnaireOptionCode.quiet,
    QuestionnaireOptionCode.cozy,
    QuestionnaireOptionCode.lively,
    QuestionnaireOptionCode.scenic,
  ],
} as const satisfies Record<
  QuestionnaireDimensionCode,
  readonly QuestionnaireOptionCode[]
>
