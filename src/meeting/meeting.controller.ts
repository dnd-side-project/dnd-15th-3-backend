import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Patch,
  Post,
  Put,
  Query,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { MapPinsResponseDto } from 'src/place/dto/map-pins-response.dto'
import { PlaceSortOption } from 'src/place/enums/place-sort-option.enum'
import { AddPlaceRequestDto } from './dto/add-place-request.dto'
import { MeetingPlaceRecommendationListDto } from './dto/meeting-place-recommendation-list.dto'
import { MeetingStatusResponseDto } from './dto/meeting-status-response.dto'
import { PlacePreferenceResponseDto } from './dto/place-preference-response.dto'
import { UpdateCourseImageRequestDto } from './dto/update-course-image-request.dto'
import { UpdatePlacePreferenceRequestDto } from './dto/update-place-preference-request.dto'
import { MeetingStatus } from './enums/meeting-status.enum'

@ApiTags('모임')
@Controller('meetings')
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
      '사용자가 공유한 장소와 모임 시작지를 구분해서 반환합니다. ' +
      '모임이 장소 추천 수집 중, 코스 생성 중, 코스 생성 실패 상태일 때만 호출할 수 있고, ' +
      '코스가 생성 완료되었거나 확정된 상태에서는 호출할 수 없습니다.',
  })
  @ApiOkResponse({ type: MapPinsResponseDto })
  @ApiBadRequestResponse({ description: 'meetingId 형식이 올바르지 않습니다.' })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 또는 확정된 상태여서 지도 핀을 조회할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getMapPins(@Param('meetingId', BigIntStringPipe) meetingId: string): never {
    throw new NotImplementedException(
      '전체 지도 핀 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get(':meetingId/places')
  @ApiParam({
    name: 'meetingId',
    description: '조회할 모임의 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'category',
    description: '카테고리 필터. 미지정 시 전체 카테고리를 조회합니다.',
    enum: CategorySlug,
    required: false,
    example: CategorySlug.Cafe,
  })
  @ApiQuery({
    name: 'sort',
    description: '정렬 기준. 미지정 시 추천순으로 정렬합니다.',
    enum: PlaceSortOption,
    enumName: 'PlaceSortOption',
    required: false,
    example: PlaceSortOption.Recommended,
  })
  @ApiOperation({
    summary: '추가된 장소 목록 조회',
    description:
      '모임에 추가된 장소 목록을 조회합니다. ' +
      '전체 또는 카테고리별로 필터링할 수 있고, 추천순/생성일순 정렬을 선택할 수 있습니다. ' +
      '개수가 많지 않은 목록이므로 페이지네이션 없이 전체 목록을 한 번에 반환합니다. ' +
      '모임이 장소 추천 수집 중, 코스 생성 중, 코스 생성 실패 상태일 때만 호출할 수 있고, ' +
      '코스가 생성 완료되었거나 확정된 상태에서는 호출할 수 없습니다.',
  })
  @ApiOkResponse({ type: MeetingPlaceRecommendationListDto })
  @ApiBadRequestResponse({
    description:
      'meetingId 형식이 올바르지 않거나 category, sort 값이 유효하지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 또는 확정된 상태여서 장소 목록을 조회할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getPlaces(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('category') category?: CategorySlug,
    @Query('sort') sort?: PlaceSortOption,
  ): never {
    throw new NotImplementedException(
      '추가된 장소 목록 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Post(':meetingId/places')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '장소 추가',
    description:
      '장소 리스트에서 + 버튼을 눌러 장소를 모임에 추가합니다. ' +
      '이미 추가된 장소를 동시에 추가 요청하면 409로 거부됩니다. ' +
      '모임이 장소 추천 수집 중, 코스 생성 완료, 코스 생성 실패 상태일 때만 호출할 수 있고, ' +
      '코스 생성 중이거나 코스가 확정된 상태에서는 호출할 수 없습니다.',
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
  @ApiConflictResponse({
    description:
      '이미 추가된 장소이거나, 모임이 코스 생성 중이거나 코스가 확정된 상태여서 장소를 추가할 수 없습니다.',
  })
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

  @Patch(':meetingId/places/:recommendationId/preference')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'recommendationId',
    description: '추천 장소 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiOperation({
    summary: '장소 반응(좋아요/싫어요) 설정',
    description:
      '추가된 장소에 대한 내 반응을 좋아요 또는 싫어요로 설정합니다. ' +
      'preference를 null로 보내면 기존 반응을 취소합니다. ' +
      '모임이 장소 추천 수집 중, 코스 생성 완료, 코스 생성 실패 상태일 때만 호출할 수 있고, ' +
      '코스 생성 중이거나 코스가 확정된 상태에서는 호출할 수 없습니다.',
  })
  @ApiBody({ type: UpdatePlacePreferenceRequestDto })
  @ApiOkResponse({ type: PlacePreferenceResponseDto })
  @ApiBadRequestResponse({
    description:
      'meetingId, recommendationId 형식이 올바르지 않거나 preference 값이 유효하지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임 또는 추천 장소를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 중이거나 코스가 확정된 상태여서 반응을 변경할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  updatePlacePreference(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('recommendationId', BigIntStringPipe) recommendationId: string,
    @Body() _dto: UpdatePlacePreferenceRequestDto,
  ): never {
    throw new NotImplementedException(
      '장소 반응 설정 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Put(':meetingId/course-image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiOperation({
    summary: '코스 카드 이미지 설정',
    description:
      '확정된 코스의 카드 뒷면에 사용할 지도 스크린샷 key를 재설정합니다. ' +
      '코스 확정 시 이미지 업로드에 실패했거나 다시 설정하고 싶을 때 사용합니다. ' +
      '방장만 호출할 수 있고, 모임이 코스 확정 상태일 때만 호출할 수 있습니다.',
  })
  @ApiBody({ type: UpdateCourseImageRequestDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '코스 카드 이미지 설정 성공',
  })
  @ApiBadRequestResponse({
    description:
      'meetingId 형식이 올바르지 않거나 courseImageKey가 비어 있습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '방장이 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description:
      '모임이 코스 확정 상태가 아니어서 코스 카드 이미지를 설정할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  updateCourseImage(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Body() _dto: UpdateCourseImageRequestDto,
  ): never {
    throw new NotImplementedException(
      '코스 카드 이미지 설정 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}
