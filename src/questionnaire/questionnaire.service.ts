import { Injectable } from '@nestjs/common'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { assertAccessToken } from 'src/meeting/access/meeting-access.utils'
import { Meeting } from 'src/meeting/entities/meeting.entity'
import { MeetingParticipant } from 'src/meeting/entities/meeting-participant.entity'
import { MeetingStatus } from 'src/meeting/enums/meeting-status.enum'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { MeetingException } from 'src/meeting/exception/meeting.exception'
import { MeetingErrorCode } from 'src/meeting/exception/meeting-error-code'
import type { EntityManager } from 'typeorm'
import { DataSource } from 'typeorm'
import { QuestionnaireResponseDto } from './dto/questionnaire-response.dto'
import { MeetingQuestion } from './entities/meeting-question.entity'
import { MeetingQuestionOption } from './entities/meeting-question-option.entity'
import { MeetingQuestionnaire } from './entities/meeting-questionnaire.entity'
import { QuestionnaireGenerationStatus } from './enums/questionnaire-generation-status.enum'
import type { QuestionnaireSource } from './enums/questionnaire-source.enum'
import { QuestionnaireException } from './exception/questionnaire.exception'
import { QuestionnaireErrorCode } from './exception/questionnaire-error-code'
import {
  QUESTIONNAIRE_PROMPT_VERSION,
  QUESTIONNAIRE_QUESTION_COUNT,
  QUESTIONNAIRE_SCHEMA_VERSION,
} from './questionnaire.constants'
import { FIRST_QUESTION_TEMPLATE } from './questionnaire.templates'

export type QuestionnaireAnswerInput = {
  questionId: string
  optionId: string
}

export type ResolvedQuestionnaireAnswers = {
  questionnaire: MeetingQuestionnaire
  answers: Array<{
    question: MeetingQuestion
    option: MeetingQuestionOption
  }>
  snapshot: {
    questionnaireId: string
    questionnaireVersion: number
    schemaVersion: number
    promptVersion: number
    source: QuestionnaireSource
    provider: string
    model: string
    answers: Array<{
      questionCode: string
      questionText: string
      optionCode: string
      optionLabel: string
    }>
  }
}

@Injectable()
export class QuestionnaireService {
  constructor(private readonly dataSource: DataSource) {}

  async createQuestionnaire(
    meetingId: string,
    accessToken: string,
  ): Promise<QuestionnaireResponseDto> {
    assertAccessToken(accessToken)
    const normalizedAccessToken = accessToken.trim()

    const questionnaireId = await this.dataSource.transaction(
      async (manager) => {
        const participant = await manager
          .getRepository(MeetingParticipant)
          .findOne({
            where: {
              meeting: { id: meetingId },
              accessToken: normalizedAccessToken,
            },
          })
        if (!participant) {
          const meetingExists = await manager
            .getRepository(Meeting)
            .exists({ where: { id: meetingId } })
          if (!meetingExists) {
            throw new MeetingException(MeetingErrorCode.notFound)
          }
          throw new CommonException(CommonErrorCode.authenticationFailed)
        }
        if (participant.role !== ParticipantRole.Host) {
          throw new MeetingException(MeetingErrorCode.hostOnly)
        }

        const meeting = await manager
          .getRepository(Meeting)
          .createQueryBuilder('meeting')
          .where('meeting.id = :meetingId', { meetingId })
          .setLock('pessimistic_write')
          .getOne()
        if (!meeting) {
          throw new MeetingException(MeetingErrorCode.notFound)
        }
        if (meeting.status !== MeetingStatus.RecommendationCollecting) {
          throw new QuestionnaireException(
            QuestionnaireErrorCode.generationNotAllowed,
          )
        }

        const repository = manager.getRepository(MeetingQuestionnaire)
        const existing = await repository.findOne({
          where: { meeting: { id: meetingId } },
          order: { version: 'DESC' },
        })
        if (
          existing?.generationStatus === QuestionnaireGenerationStatus.Ready ||
          existing?.generationStatus ===
            QuestionnaireGenerationStatus.Generating
        ) {
          return existing.id
        }

        if (existing) {
          existing.schemaVersion = QUESTIONNAIRE_SCHEMA_VERSION
          existing.promptVersion = QUESTIONNAIRE_PROMPT_VERSION
          existing.generationStatus = QuestionnaireGenerationStatus.Generating
          existing.source = null
          existing.provider = 'pending'
          existing.model = 'pending'
          existing.generationError = null
          existing.generationStartedAt = null
          existing.generatedAt = null
          await repository.save(existing)
          await this.ensureFirstQuestion(manager, existing)
          return existing.id
        }

        const questionnaire = await repository.save(
          repository.create({
            meeting,
            version: 1,
            schemaVersion: QUESTIONNAIRE_SCHEMA_VERSION,
            promptVersion: QUESTIONNAIRE_PROMPT_VERSION,
            generationStatus: QuestionnaireGenerationStatus.Generating,
            source: null,
            provider: 'pending',
            model: 'pending',
            generationError: null,
            generationAttemptCount: 0,
            generationStartedAt: null,
            generatedAt: null,
          }),
        )
        await this.ensureFirstQuestion(manager, questionnaire)
        return questionnaire.id
      },
    )

    return this.getQuestionnaireById(questionnaireId)
  }

  async getQuestionnaire(
    meetingId: string,
    accessToken: string,
  ): Promise<QuestionnaireResponseDto> {
    assertAccessToken(accessToken)
    const participant = await this.dataSource
      .getRepository(MeetingParticipant)
      .findOne({
        where: {
          meeting: { id: meetingId },
          accessToken: accessToken.trim(),
        },
      })
    if (!participant) {
      const meetingExists = await this.dataSource
        .getRepository(Meeting)
        .exists({ where: { id: meetingId } })
      if (!meetingExists) {
        throw new MeetingException(MeetingErrorCode.notFound)
      }
      throw new CommonException(CommonErrorCode.authenticationFailed)
    }
    if (participant.role !== ParticipantRole.Host) {
      throw new MeetingException(MeetingErrorCode.hostOnly)
    }

    const questionnaire = await this.dataSource
      .getRepository(MeetingQuestionnaire)
      .findOne({
        where: { meeting: { id: meetingId } },
        order: { version: 'DESC' },
      })
    if (!questionnaire) {
      throw new QuestionnaireException(QuestionnaireErrorCode.notFound)
    }
    return this.getQuestionnaireById(questionnaire.id)
  }

  async resolveAnswers(
    manager: EntityManager,
    meetingId: string,
    questionnaireId: string,
    questionnaireVersion: number,
    answerInputs: QuestionnaireAnswerInput[],
  ): Promise<ResolvedQuestionnaireAnswers> {
    const questionnaire = await manager
      .getRepository(MeetingQuestionnaire)
      .findOne({
        where: { id: questionnaireId, meeting: { id: meetingId } },
        relations: { questions: { options: true } },
      })
    if (!questionnaire) {
      throw new QuestionnaireException(QuestionnaireErrorCode.notFound)
    }
    if (questionnaire.version !== questionnaireVersion) {
      throw new QuestionnaireException(QuestionnaireErrorCode.stale)
    }
    if (
      questionnaire.generationStatus !== QuestionnaireGenerationStatus.Ready ||
      !questionnaire.source
    ) {
      throw new QuestionnaireException(QuestionnaireErrorCode.notReady)
    }
    if (
      questionnaire.questions.length !== QUESTIONNAIRE_QUESTION_COUNT ||
      answerInputs.length !== questionnaire.questions.length
    ) {
      throw new QuestionnaireException(QuestionnaireErrorCode.invalidAnswers)
    }

    const questionsById = new Map(
      questionnaire.questions.map((question) => [question.id, question]),
    )
    const seenQuestionIds = new Set<string>()
    const answers = answerInputs.map((answerInput) => {
      const question = questionsById.get(answerInput.questionId)
      if (!question || seenQuestionIds.has(answerInput.questionId)) {
        throw new QuestionnaireException(QuestionnaireErrorCode.invalidAnswers)
      }
      const option = question.options.find(
        (candidate) => candidate.id === answerInput.optionId,
      )
      if (!option) {
        throw new QuestionnaireException(QuestionnaireErrorCode.invalidAnswers)
      }
      seenQuestionIds.add(question.id)
      return { question, option }
    })
    answers.sort((a, b) => a.question.order - b.question.order)

    return {
      questionnaire,
      answers,
      snapshot: {
        questionnaireId: questionnaire.id,
        questionnaireVersion: questionnaire.version,
        schemaVersion: questionnaire.schemaVersion,
        promptVersion: questionnaire.promptVersion,
        source: questionnaire.source,
        provider: questionnaire.provider,
        model: questionnaire.model,
        answers: answers.map(({ question, option }) => ({
          questionCode: question.dimensionCode,
          questionText: question.text,
          optionCode: option.semanticCode,
          optionLabel: option.label,
        })),
      },
    }
  }

  private async getQuestionnaireById(
    questionnaireId: string,
  ): Promise<QuestionnaireResponseDto> {
    const questionnaire = await this.dataSource
      .getRepository(MeetingQuestionnaire)
      .findOne({
        where: { id: questionnaireId },
        relations: { questions: { options: true } },
      })
    if (!questionnaire) {
      throw new QuestionnaireException(QuestionnaireErrorCode.notFound)
    }

    const questions = [...(questionnaire.questions ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        questionId: question.id,
        order: question.order,
        text: question.text,
        options: [...(question.options ?? [])]
          .sort((a, b) => a.order - b.order)
          .map((option) => ({
            optionId: option.id,
            order: option.order,
            emoji: option.emoji,
            label: option.label,
          })),
      }))

    return {
      status: questionnaire.generationStatus,
      questionnaireId: questionnaire.id,
      version: questionnaire.version,
      totalCount: QUESTIONNAIRE_QUESTION_COUNT,
      availableCount: questions.length,
      questions,
    }
  }

  private async ensureFirstQuestion(
    manager: EntityManager,
    questionnaire: MeetingQuestionnaire,
  ): Promise<void> {
    const questionRepository = manager.getRepository(MeetingQuestion)
    const firstQuestionExists = await questionRepository.exists({
      where: { questionnaire: { id: questionnaire.id }, order: 1 },
    })
    if (firstQuestionExists) return

    const question = await questionRepository.save(
      questionRepository.create({
        questionnaire,
        order: 1,
        dimensionCode: FIRST_QUESTION_TEMPLATE.dimensionCode,
        text: FIRST_QUESTION_TEMPLATE.text,
      }),
    )
    const optionRepository = manager.getRepository(MeetingQuestionOption)
    await optionRepository.save(
      FIRST_QUESTION_TEMPLATE.options.map((option, index) =>
        optionRepository.create({
          question,
          order: index + 1,
          semanticCode: option.semanticCode,
          emoji: option.emoji,
          label: option.label,
        }),
      ),
    )
  }
}
