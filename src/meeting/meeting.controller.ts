import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Post,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { CategoryVisitOrderResponseDto } from 'src/course/dto/category-visit-order-response.dto'
import { MapPinsResponseDto } from 'src/place/dto/map-pins-response.dto'
import { AddPlaceRequestDto } from './dto/add-place-request.dto'
import { MeetingStatusResponseDto } from './dto/meeting-status-response.dto'
import { MeetingStatus } from './enums/meeting-status.enum'

@ApiTags('모임')
@Controller('api/v1/meetings')
export class MeetingController {
  @Get(':meetingId')
  @ApiParam({
    name: 'meetingId',
    description: '조회할 모임의 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiOperation({
    summary: '모임 상태 조회',
    description:
      '모임이 현재 어느 단계에 있는지 조회합니다. ' +
      '장소 추천 수집 중(RECOMMENDATION_COLLECTING) → 코스 생성 중(COURSE_GENERATING) → ' +
      '코스 생성 완료(COURSE_GENERATED) 또는 생성 실패(COURSE_GENERATION_FAILED) → ' +
      '코스 확정(COURSE_CONFIRMED) 순서로 진행됩니다.',
  })
  @ApiOkResponse({ type: MeetingStatusResponseDto })
  @ApiBadRequestResponse({ description: 'meetingId 형식이 올바르지 않습니다.' })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
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
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiOperation({
    summary: '카테고리 방문 순서 조회',
    description: '설정한 모임의 카테고리 방문 순서를 조회합니다.',
  })
  @ApiOkResponse({ type: CategoryVisitOrderResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'meetingId 형식이 올바르지 않습니다.' })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
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
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiOperation({
    summary: '전체 지도 핀 조회',
    description:
      '지도에 추가한 모든 장소의 위치 정보가 핀으로 표시됩니다. ' +
      '사용자가 공유한 장소와 모임 시작지를 구분해서 반환합니다.',
  })
  @ApiOkResponse({ type: MapPinsResponseDto })
  @ApiBadRequestResponse({ description: 'meetingId 형식이 올바르지 않습니다.' })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getMapPins(@Param('meetingId', BigIntStringPipe) meetingId: string): never {
    throw new NotImplementedException(
      '전체 지도 핀 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Post(':meetingId/places')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '장소 추가',
    description:
      '장소 리스트에서 + 버튼을 눌러 장소를 모임에 추가합니다. ' +
      '이미 추가된 장소를 동시에 추가 요청하면 409로 거부됩니다.',
  })
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiBody({ type: AddPlaceRequestDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: '장소 추가 성공' })
  @ApiBadRequestResponse({
    description: 'meetingId 형식이 올바르지 않거나 placeId가 비어 있습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임 또는 장소를 찾을 수 없습니다.' })
  @ApiConflictResponse({ description: '이미 추가된 장소입니다.' })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  addPlace(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Body() _dto: AddPlaceRequestDto,
  ): never {
    throw new NotImplementedException(
      '장소 추가 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}
