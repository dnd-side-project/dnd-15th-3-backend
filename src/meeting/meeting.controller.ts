import { Controller, Get, Param } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ApiErrorResponse } from 'src/common/decorators/api-error-response.decorator'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { MeetingStatusResponseDto } from './dto/meeting-status-response.dto'
import { MeetingStatus } from './enums/meeting-status.enum'
import { MeetingErrorCode } from './exception/meeting-error-code'

@ApiTags('Meeting')
@Controller('api/v1/meetings')
export class MeetingController {
  @Get(':meetingId')
  @ApiParam({
    name: 'meetingId',
    description: '조회할 모임의 ID',
    example: '1',
  })
  @ApiOperation({
    summary: '모임 상태 조회',
    description:
      '모임이 현재 어느 단계에 있는지 조회합니다. ' +
      '장소 추천 수집 중(RECOMMENDATION_COLLECTING) → 코스 생성 중(COURSE_GENERATING) → ' +
      '코스 생성 완료(COURSE_GENERATED) 또는 생성 실패(COURSE_GENERATION_FAILED) → ' +
      '코스 확정(COURSE_CONFIRMED) 순서로 진행됩니다.',
  })
  @ApiResponse({ status: 200, type: MeetingStatusResponseDto })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    'meetingId 형식이 올바르지 않음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    '인증 정보가 없거나 유효하지 않음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.notParticipant,
    '해당 모임의 참여자가 아님',
  )
  @ApiErrorResponse(MeetingErrorCode.notFound, '모임을 찾을 수 없음')
  @ApiErrorResponse(
    CommonErrorCode.internalServerError,
    '예상하지 못한 서버 오류',
  )
  getMeetingStatus(
    @Param('meetingId') meetingId: string,
  ): MeetingStatusResponseDto {
    return { status: MeetingStatus.RecommendationCollecting }
  }
}
