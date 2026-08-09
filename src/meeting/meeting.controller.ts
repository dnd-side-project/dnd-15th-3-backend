import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { PlaceSearchResponseDto } from 'src/catalog/dto/place-search-response.dto'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { BigIntStringArrayPipe } from 'src/common/pipes/bigint-string-array.pipe'
import { PositiveIntPipe } from 'src/common/pipes/positive-int.pipe'
import { MapPinsResponseDto } from 'src/place/dto/map-pins-response.dto'
import { PlaceSortOption } from 'src/place/enums/place-sort-option.enum'
import { AddPlaceRequestDto } from './dto/add-place-request.dto'
import { CoursePlanResponseDto } from './dto/course-plan-response.dto'
import { CreateMeetingDto } from './dto/create-meeting.dto'
import { InvitationPreviewRequestDto } from './dto/invitation-preview-request.dto'
import { JoinMeetingDto } from './dto/join-meeting.dto'
import { MeetingInvitationResponseDto } from './dto/meeting-invitation-response.dto'
import { MeetingPlaceRecommendationDto } from './dto/meeting-place-recommendation.dto'
import { MeetingPlaceRecommendationListDto } from './dto/meeting-place-recommendation-list.dto'
import { MeetingScreenResponseDto } from './dto/meeting-screen-response.dto'
import { MeetingStatusResponseDto } from './dto/meeting-status-response.dto'
import { PlacePreferenceResponseDto } from './dto/place-preference-response.dto'
import { UpdateCourseImageRequestDto } from './dto/update-course-image-request.dto'
import { UpdateCoursePlanDto } from './dto/update-course-plan.dto'
import { UpdatePlacePreferenceRequestDto } from './dto/update-place-preference-request.dto'
import { MeetingStatus } from './enums/meeting-status.enum'

@ApiTags('모임')
@Controller('meetings')
export class MeetingController {
  @Post()
  @ApiOperation({
    summary: '모임 생성',
    description:
      '호스트 온보딩의 모임 유형·장소·카테고리·날짜/시간·프로필 입력을 한 번에 저장하고 초대 코드를 발급합니다.',
  })
  @ApiCreatedResponse({
    description: '모임 생성 및 방장 참여 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiBadRequestResponse({
    description: '필수 입력값 또는 날짜/시간 형식이 올바르지 않습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  createMeeting(@Body() _dto: CreateMeetingDto): never {
    throw new NotImplementedException(
      '모임 생성 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get(':meetingId/course-plan')
  @ApiOperation({
    summary: '코스 계획 조회',
    description:
      '현재 선택된 카테고리와 순서를 조회합니다. 코스 순서는 categorySteps 배열 순서와 order로 표현됩니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '코스 계획 조회 성공',
    type: CoursePlanResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getCoursePlan(
    @Param('meetingId') _meetingId: string,
    @Query('accessToken') _accessToken: string,
  ): never {
    throw new NotImplementedException(
      '코스 계획 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Put(':meetingId/course-plan')
  @ApiOperation({
    summary: '코스 계획 전체 저장',
    description:
      '추가·삭제·순서 변경 결과를 현재 전체 배열로 교체합니다. Drag & drop 중간 이벤트가 아니라 저장 시점에 호출합니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '코스를 수정할 방장의 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '코스 계획 저장 성공',
    type: CoursePlanResponseDto,
  })
  @ApiBadRequestResponse({
    description: `코스 카테고리가 ${MAX_COURSE_STEPS}개를 초과했습니다.`,
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({
    description: '방장만 코스 계획을 수정할 수 있습니다.',
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  @ApiConflictResponse({
    description:
      '오래된 version으로 저장을 시도했습니다. 최신 계획을 다시 조회하세요.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  updateCoursePlan(
    @Param('meetingId') _meetingId: string,
    @Query('accessToken') _accessToken: string,
    @Body() _dto: UpdateCoursePlanDto,
  ): never {
    throw new NotImplementedException(
      '코스 계획 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Post('invitation/preview')
  @ApiOperation({
    summary: '초대 코드 검증 및 모임 미리보기',
    description:
      '초대 코드 입력 화면에서 호출합니다. 코드가 유효하면 모임 정보를 반환하고, 이후 프로필 입력·참여 단계로 이동할 수 있습니다. 이 단계에서는 아직 참여자 전용 토큰을 발급하지 않습니다.',
  })
  @ApiOkResponse({
    description: '초대 코드 검증 및 모임 미리보기 성공',
    type: MeetingInvitationResponseDto,
  })
  @ApiBadRequestResponse({
    description: '초대 코드가 비어 있거나 6자리 형식이 아닙니다.',
  })
  @ApiNotFoundResponse({
    description:
      '유효하지 않거나 삭제된 초대 코드입니다. 초대 코드 오류 화면으로 이동합니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  previewInvitation(@Body() _dto: InvitationPreviewRequestDto): never {
    throw new NotImplementedException(
      '초대 코드 미리보기 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Post('join')
  @ApiOperation({
    summary: '모임 참여',
    description:
      '게스트가 초대 코드를 입력하고 프로필을 선택한 뒤 모임에 참여합니다. 동일한 사용자의 재시도는 기존 참여자를 반환합니다.',
  })
  @ApiCreatedResponse({
    description: '모임 참여 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiBadRequestResponse({
    description: '초대 코드 형식 또는 프로필 입력이 올바르지 않습니다.',
  })
  @ApiNotFoundResponse({
    description: '유효하지 않거나 삭제된 초대 코드입니다.',
  })
  @ApiConflictResponse({
    description: '다른 사용자 키와 중복된 닉네임 등 참여 제약에 걸렸습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  joinMeeting(@Body() _dto: JoinMeetingDto): never {
    throw new NotImplementedException(
      '모임 참여 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

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
      '코스 확정(COURSE_CONFIRMED) 순서로 진행됩니다. ' +
      'AI 코스 생성이 실패하면 내부 로직으로 경로를 직접 생성하는 방식으로 재시도하며, ' +
      '이마저 실패하면 COURSE_GENERATION_FAILED로 전환됩니다.',
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
    @Query('category', new ParseEnumPipe(CategorySlug, { optional: true }))
    category?: CategorySlug,
    @Query('sort', new ParseEnumPipe(PlaceSortOption, { optional: true }))
    sort?: PlaceSortOption,
  ): never {
    throw new NotImplementedException(
      '추가된 장소 목록 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Post(':meetingId/places')
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
  @ApiCreatedResponse({
    description: '장소 추가 성공',
    type: MeetingPlaceRecommendationDto,
  })
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

  @Get(':meetingId/places/:placeId/similar')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'placeId',
    description: '기준이 되는 장소 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'excludeIds',
    description:
      '추천 결과에서 제외할 장소 ID 목록(콤마로 구분). ' +
      '현재 화면에 노출 중인 추천 장소를 전달합니다.',
    required: false,
    example: '2,3,4',
  })
  @ApiQuery({
    name: 'size',
    description: '반환받을 추천 장소 개수. 미지정 시 5개',
    required: false,
    default: 5,
    example: 5,
  })
  @ApiOperation({
    summary: '비슷한 장소 추천',
    description:
      '기준 장소와 같은 카테고리이면서 일정 반경 이내에 있는 장소를 무작위로 추천합니다. ' +
      '모임이 장소 추천 수집 중, 코스 생성 중, 코스 생성 완료, 코스 생성 실패 상태일 때만 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: PlaceSearchResponseDto, isArray: true })
  @ApiBadRequestResponse({
    description:
      'meetingId, placeId 형식이 올바르지 않거나 excludeIds, size 값이 유효하지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임 또는 장소를 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description:
      '모임이 장소 추천 수집 중, 코스 생성 중, 코스 생성 완료, 코스 생성 실패 상태가 아니어서 비슷한 장소를 추천받을 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getSimilarPlaces(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('placeId', BigIntStringPipe) placeId: string,
    @Query('excludeIds', BigIntStringArrayPipe) excludeIds?: string[],
    @Query('size', new PositiveIntPipe(5)) size?: number,
  ): never {
    throw new NotImplementedException(
      '비슷한 장소 추천 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}

@ApiTags('모임')
@Controller('meeting')
export class MeetingDetailController {
  @Get(':meetingId')
  @ApiOperation({
    summary: '참여자 전용 모임 상세 조회',
    description:
      '방장과 일반 참여원이 동일하게 호출합니다. meetingId와 참여자 전용 accessToken을 함께 검증한 뒤 역할에 맞는 모임 상세 정보와 공통 placeId를 반환합니다. 검증에 실패하면 프론트에서 초대 코드 화면으로 이동할 수 있습니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '역할별 모임 상세 조회 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'accessToken이 없거나 유효하지 않아 초대 코드 화면으로 이동해야 합니다.',
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getMeetingDetail(
    @Param('meetingId') _meetingId: string,
    @Query('accessToken') _accessToken: string,
  ): never {
    throw new NotImplementedException(
      '모임 상세 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}
