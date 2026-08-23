import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { QuestionnaireResponseDto } from './dto/questionnaire-response.dto'
import { QuestionnaireService } from './questionnaire.service'

@ApiTags('모임 질문')
@Controller('meetings')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Post(':meetingId/questionnaire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '모임 질문 생성',
    description:
      '고정된 첫 질문을 즉시 반환하고 후속 질문 2개를 비동기로 생성합니다. status가 GENERATING이면 GET API로 진행 상태를 조회할 수 있습니다.',
  })
  @ApiParam({ name: 'meetingId', example: '1' })
  @ApiQuery({ name: 'accessToken', required: true })
  @ApiOkResponse({ type: QuestionnaireResponseDto })
  @ApiUnauthorizedResponse({ description: '참여자 토큰이 유효하지 않음' })
  @ApiForbiddenResponse({ description: '방장이 아님' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없음' })
  @ApiConflictResponse({
    description: '현재 모임 상태에서는 질문을 생성할 수 없음',
  })
  createQuestionnaire(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') accessToken: string,
  ): Promise<QuestionnaireResponseDto> {
    return this.questionnaireService.createQuestionnaire(meetingId, accessToken)
  }

  @Get(':meetingId/questionnaire')
  @ApiOperation({ summary: '현재 모임 질문 조회' })
  @ApiParam({ name: 'meetingId', example: '1' })
  @ApiQuery({ name: 'accessToken', required: true })
  @ApiOkResponse({ type: QuestionnaireResponseDto })
  @ApiUnauthorizedResponse({ description: '참여자 토큰이 유효하지 않음' })
  @ApiForbiddenResponse({ description: '방장이 아님' })
  @ApiNotFoundResponse({ description: '모임 또는 질문을 찾을 수 없음' })
  getQuestionnaire(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') accessToken: string,
  ): Promise<QuestionnaireResponseDto> {
    return this.questionnaireService.getQuestionnaire(meetingId, accessToken)
  }
}
