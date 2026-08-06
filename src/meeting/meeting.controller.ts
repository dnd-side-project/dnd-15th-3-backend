import {
  Controller,
  Get,
  HttpStatus,
  NotImplementedException,
  Param,
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ApiErrorResponse } from 'src/common/decorators/api-error-response.decorator'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { CategoryVisitOrderResponseDto } from 'src/course/dto/category-visit-order-response.dto'
import { MapPinsResponseDto } from 'src/place/dto/map-pins-response.dto'
import { MeetingStatusResponseDto } from './dto/meeting-status-response.dto'
import { MeetingStatus } from './enums/meeting-status.enum'
import { MeetingErrorCode } from './exception/meeting-error-code'

@ApiTags('모임')
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
  @ApiResponse({ status: HttpStatus.OK, type: MeetingStatusResponseDto })
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
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getMeetingStatus(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
  ): never {
    throw new NotImplementedException(
      '모임 상태 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get(':meetingId/categories')
  @ApiParam({
    name: 'meetingId',
    description: '조회할 모임의 ID',
    example: '1',
  })
  @ApiOperation({
    summary: '카테고리 방문 순서 조회',
    description: '설정한 모임의 카테고리 방문 순서를 조회합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CategoryVisitOrderResponseDto,
    isArray: true,
  })
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
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getCategoryVisitOrder(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
  ): never {
    throw new NotImplementedException(
      '카테고리 방문 순서 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get(':meetingId/places/pins')
  @ApiParam({
    name: 'meetingId',
    description: '조회할 모임의 ID',
    example: '1',
  })
  @ApiOperation({
    summary: '전체 지도 핀 조회',
    description:
      '지도에 추가한 모든 장소의 위치 정보가 핀으로 표시됩니다. ' +
      '사용자가 공유한 장소와 모임 시작지를 구분해서 반환합니다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: MapPinsResponseDto })
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
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getMapPins(@Param('meetingId', BigIntStringPipe) meetingId: string): never {
    throw new NotImplementedException(
      '전체 지도 핀 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}
