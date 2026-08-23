import { ApiProperty } from '@nestjs/swagger'
import { QuestionnaireGenerationStatus } from '../enums/questionnaire-generation-status.enum'

export class QuestionnaireOptionResponseDto {
  @ApiProperty({ example: '1001', pattern: '^\\d+$' })
  optionId!: string

  @ApiProperty({ example: 1 })
  order!: number

  @ApiProperty({ example: '🗣️' })
  emoji!: string

  @ApiProperty({ example: '오랜만에 만나 대화하기' })
  label!: string
}

export class QuestionnaireQuestionResponseDto {
  @ApiProperty({ example: '101', pattern: '^\\d+$' })
  questionId!: string

  @ApiProperty({ example: 1 })
  order!: number

  @ApiProperty({
    example: '이번 만남에서 가장 중요하게 생각하는 목적이 어떤 쪽인가요?',
  })
  text!: string

  @ApiProperty({ type: QuestionnaireOptionResponseDto, isArray: true })
  options!: QuestionnaireOptionResponseDto[]
}

export class QuestionnaireResponseDto {
  @ApiProperty({
    enum: QuestionnaireGenerationStatus,
    description:
      'GENERATING이면 첫 질문을 사용할 수 있고 후속 질문을 생성 중입니다.',
  })
  status!: QuestionnaireGenerationStatus

  @ApiProperty({ example: '12', pattern: '^\\d+$' })
  questionnaireId!: string

  @ApiProperty({ example: 1 })
  version!: number

  @ApiProperty({ example: 3, description: '완성될 전체 질문 수' })
  totalCount!: number

  @ApiProperty({ example: 1, description: '현재 응답에 포함된 질문 수' })
  availableCount!: number

  @ApiProperty({ type: QuestionnaireQuestionResponseDto, isArray: true })
  questions!: QuestionnaireQuestionResponseDto[]
}
