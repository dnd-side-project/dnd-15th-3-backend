import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger'
import { QUESTIONNAIRE_QUESTION_COUNT } from 'src/questionnaire/questionnaire.constants'
import { CourseGenerationCustomizationType } from '../enums/course-generation-customization-type.enum'

export class CourseGenerationAnswerDto {
  @ApiProperty({ example: '101', pattern: '^\\d+$' })
  questionId!: string

  @ApiProperty({ example: '1001', pattern: '^\\d+$' })
  optionId!: string
}

export class SkipCourseCustomizationDto {
  @ApiProperty({
    enum: [CourseGenerationCustomizationType.Skip],
    example: CourseGenerationCustomizationType.Skip,
  })
  type!: CourseGenerationCustomizationType.Skip
}

export class QuestionnaireCourseCustomizationDto {
  @ApiProperty({
    enum: [CourseGenerationCustomizationType.Questionnaire],
    example: CourseGenerationCustomizationType.Questionnaire,
  })
  type!: CourseGenerationCustomizationType.Questionnaire

  @ApiProperty({ example: '12', pattern: '^\\d+$' })
  questionnaireId!: string

  @ApiProperty({ example: 1 })
  questionnaireVersion!: number

  @ApiProperty({
    type: CourseGenerationAnswerDto,
    isArray: true,
    minItems: QUESTIONNAIRE_QUESTION_COUNT,
    maxItems: QUESTIONNAIRE_QUESTION_COUNT,
  })
  answers!: CourseGenerationAnswerDto[]
}

@ApiExtraModels(SkipCourseCustomizationDto, QuestionnaireCourseCustomizationDto)
export class GenerateCourseRequestDto {
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(SkipCourseCustomizationDto) },
      { $ref: getSchemaPath(QuestionnaireCourseCustomizationDto) },
    ],
    discriminator: { propertyName: 'type' },
  })
  customization!:
    | SkipCourseCustomizationDto
    | QuestionnaireCourseCustomizationDto
}
